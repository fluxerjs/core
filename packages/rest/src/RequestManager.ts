import type { APIErrorBody, RateLimitErrorBody } from '@fluxerjs/types';
import { FluxerAPIError, HTTPError, RateLimitError } from './errors/index.js';
import { sharedFetch } from './fetch/sharedFetch.js';
import { RateLimitManager } from './RateLimitManager.js';
import {
  DEFAULT_API,
  DEFAULT_USER_AGENT,
  DEFAULT_VERSION,
  MAX_RETRIES,
  REQUEST_TIMEOUT,
} from './utils/constants.js';
import { type AttachmentPayload, buildFormData } from './utils/files.js';

export interface RequestOptions {
  body?: unknown | FormData;
  headers?: Record<string, string>;
  files?: AttachmentPayload[];
  auth?: boolean;
  /** Aborts the request when triggered (e.g. shutdown). Combined with the client timeout. */
  signal?: AbortSignal;
}

/** Context used to choose the retry budget for one logical request. */
export interface RetryPolicyContext {
  /** HTTP method supplied to the request manager. */
  method: string;
  /** Sanitized route metadata for policy matching. */
  routeKey: string;
  /** Validated fallback retry budget from the REST configuration. */
  defaultRetries: number;
}

/**
 * Resolves the retry budget for one logical request.
 * Return `undefined` to retain the configured default.
 */
export type RetryPolicy = (context: RetryPolicyContext) => number | undefined;

export interface RestOptions {
  api: string;
  version: string;
  authPrefix: 'Bot' | 'Bearer';
  timeout: number;
  retries: number;
  retryPolicy?: RetryPolicy;
  userAgent: string;
}

const ROUTE_HASH_CACHE_MAX = 1000;
const SNOWFLAKE_RE = /\d{17,19}/g;
const MAJOR_PARAMETER_RE = /\/(channels|guilds|webhooks)\/(\d{17,19})(?:\/|$)/;
const WEBHOOK_TOKEN_RE = /(\/webhooks\/(?::id|\d{17,19})\/)[^/]+/;

function abortError(): Error {
  const err = new Error('The operation was aborted');
  err.name = 'AbortError';
  return err;
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true;
  return (
    typeof DOMException !== 'undefined' && err instanceof DOMException && err.name === 'AbortError'
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

function isAPIErrorBody(value: unknown): value is APIErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.message === 'string' && (typeof v.code === 'string' || typeof v.code === 'number')
  );
}

function headerInt(headers: Headers, name: string): number {
  const raw = headers.get(name);
  if (raw === null) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function parseRateLimitBody(text: string, headers: Headers): RateLimitErrorBody {
  const headerRetry = headerInt(headers, 'Retry-After');
  const fallback: RateLimitErrorBody = {
    code: 'RATE_LIMITED',
    message: 'Rate limited',
    retry_after: headerRetry,
  };
  if (!text) return fallback;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isAPIErrorBody(parsed)) return fallback;
    const retry = (parsed as { retry_after?: unknown }).retry_after;
    return {
      ...parsed,
      code: 'RATE_LIMITED',
      retry_after: typeof retry === 'number' && Number.isFinite(retry) ? retry : headerRetry,
    };
  } catch {
    return fallback;
  }
}

function backoffMs(attempt: number): number {
  return 500 * (attempt + 1);
}

function validateRetryCount(value: number, source: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${source} must be a non-negative safe integer`);
  }
  return value;
}

function stripQueryAndFragment(route: string): string {
  const query = route.indexOf('?');
  const fragment = route.indexOf('#');
  const end = Math.min(
    query === -1 ? route.length : query,
    fragment === -1 ? route.length : fragment,
  );
  return route.slice(0, end);
}

function getRetryPolicyRouteKey(route: string): string {
  if (route.startsWith('http')) {
    try {
      return `${new URL(route).origin}/:external`;
    } catch {
      return ':external';
    }
  }

  return stripQueryAndFragment(route)
    .replace(SNOWFLAKE_RE, ':id')
    .replace(WEBHOOK_TOKEN_RE, '$1:token');
}

/** Flatten Error.cause chain so "fetch failed" surfaces the real undici/network reason. */
function formatErrorChain(err: Error, maxDepth = 4): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < maxDepth && current instanceof Error; depth++) {
    if (current.message && !parts.includes(current.message)) parts.push(current.message);
    current = current.cause;
  }
  return parts.join(': ') || 'Unknown error';
}

export class RequestManager {
  private token: string | null = null;
  private readonly options: RestOptions;
  private readonly rateLimiter = new RateLimitManager();
  private readonly routeHashCache = new Map<string, string>();

  constructor(options: Partial<RestOptions>) {
    const retries = validateRetryCount(options.retries ?? MAX_RETRIES, 'retries');
    this.options = {
      api: options.api ?? DEFAULT_API,
      version: options.version ?? DEFAULT_VERSION,
      authPrefix: options.authPrefix ?? 'Bot',
      timeout: options.timeout ?? REQUEST_TIMEOUT,
      retries,
      ...(options.retryPolicy ? { retryPolicy: options.retryPolicy } : {}),
      userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
    };
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  get baseUrl(): string {
    return `${this.options.api}/v${this.options.version}`;
  }

  /** Hash route for rate limiting while preserving Fluxer's major resource parameter. */
  private getRouteHash(method: string, route: string): string {
    const cacheKey = `${method.toUpperCase()} ${route}`;
    const cached = this.routeHashCache.get(cacheKey);
    if (cached !== undefined) {
      this.routeHashCache.delete(cacheKey);
      this.routeHashCache.set(cacheKey, cached);
      return cached;
    }
    let path = stripQueryAndFragment(route);
    if (route.startsWith('http')) {
      try {
        const url = new URL(route);
        path = `${url.origin}${url.pathname}`;
      } catch {
        // Keep the caller-supplied route; fetch will report the invalid URL.
      }
    }
    const major = path.match(MAJOR_PARAMETER_RE);
    let normalized = path.replace(SNOWFLAKE_RE, ':id');
    if (major) {
      normalized = normalized.replace(`/${major[1]}/:id`, `/${major[1]}/${major[2]}`);
    }
    const hash = `${method.toUpperCase()} ${normalized.replace(WEBHOOK_TOKEN_RE, '$1:token')}`;
    if (this.routeHashCache.size >= ROUTE_HASH_CACHE_MAX) {
      const first = this.routeHashCache.keys().next().value;
      if (first !== undefined) this.routeHashCache.delete(first);
    }
    this.routeHashCache.set(cacheKey, hash);
    return hash;
  }

  private buildBody(options: RequestOptions): string | FormData | undefined {
    if (options.files?.length) {
      const payload =
        options.body !== undefined &&
        typeof options.body === 'object' &&
        options.body !== null &&
        !(options.body instanceof FormData)
          ? (options.body as Record<string, unknown>)
          : {};
      return buildFormData(payload, options.files);
    }
    if (options.body === undefined) return undefined;
    if (options.body instanceof FormData) return options.body;
    return JSON.stringify(options.body);
  }

  private buildHeaders(
    options: RequestOptions,
    body: string | FormData | undefined,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.options.userAgent,
      ...options.headers,
    };
    if (options.auth !== false && this.token) {
      headers.Authorization = `${this.options.authPrefix} ${this.token}`;
    }
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  private async parseError(
    response: Response,
    method: string,
    route: string,
  ): Promise<FluxerAPIError | HTTPError> {
    const text = await response.text();
    const ctx = { method, path: route };
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      if (isAPIErrorBody(parsed)) return new FluxerAPIError(parsed, response.status, ctx);
    } catch {
      // non-JSON body
    }
    return new HTTPError(response.status, text, ctx);
  }

  private async parseSuccess(response: Response): Promise<unknown> {
    if (response.status === 204) return undefined;
    const text = await response.text();
    if (!text) return undefined;
    const isJson = (response.headers.get('Content-Type') ?? '')
      .toLowerCase()
      .includes('application/json');
    try {
      return JSON.parse(text) as unknown;
    } catch (err) {
      if (isJson) throw err;
      return text;
    }
  }

  async request<T>(method: string, route: string, options: RequestOptions = {}): Promise<T> {
    const routeHash = this.getRouteHash(method, route);
    const retries = this.resolveRetries(method, getRetryPolicyRouteKey(route));
    const url = route.startsWith('http') ? route : `${this.baseUrl}${route}`;
    const body = this.buildBody(options);
    const headers = this.buildHeaders(options, body);
    const userSignal = options.signal;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (userSignal?.aborted) throw abortError();

      const wait = this.rateLimiter.getWaitTime(routeHash);
      if (wait > 0) await sleep(wait, userSignal);

      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.options.timeout);

      const onUserAbort = (): void => {
        controller.abort();
      };
      if (userSignal) {
        if (userSignal.aborted) {
          clearTimeout(timeoutId);
          throw abortError();
        }
        userSignal.addEventListener('abort', onUserAbort);
      }

      try {
        const response = await sharedFetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        this.rateLimiter.updateFromHeaders(routeHash, response.headers);

        if (response.status === 429) {
          const data = parseRateLimitBody(await response.text(), response.headers);
          const retryAfterSec = data.retry_after || headerInt(response.headers, 'Retry-After');
          const retryMs = Math.max(0, retryAfterSec * 1000);
          this.rateLimiter.setBucket(routeHash, 1, 0, Date.now() + retryMs);
          if (data.global) this.rateLimiter.setGlobalReset(Date.now() + retryMs);

          const err = new RateLimitError(
            { ...data, code: 'RATE_LIMITED', retry_after: retryAfterSec },
            response.status,
            { method, path: route },
          );
          if (attempt < retries) {
            lastError = err;
            await sleep(retryMs, userSignal);
            continue;
          }
          throw err;
        }

        if (!response.ok) {
          const err = await this.parseError(response, method, route);
          if (err.isRetryable && attempt < retries) {
            lastError = err;
            await sleep(backoffMs(attempt), userSignal);
            continue;
          }
          throw err;
        }

        return (await this.parseSuccess(response)) as T;
      } catch (err) {
        if (isAbortError(err)) {
          if (userSignal?.aborted) throw err;
          if (timedOut && attempt < retries) {
            lastError = err instanceof Error ? err : new Error(String(err));
            await sleep(backoffMs(attempt), userSignal);
            continue;
          }
          throw err;
        }

        if (
          err instanceof RateLimitError ||
          err instanceof FluxerAPIError ||
          err instanceof HTTPError
        ) {
          throw err;
        }

        const wrapped = err instanceof Error ? err : new Error(String(err));
        const detail = formatErrorChain(wrapped);
        lastError =
          attempt > 0
            ? new Error(`Retry ${attempt} failed: ${detail}`, { cause: wrapped })
            : detail === wrapped.message
              ? wrapped
              : new Error(detail, { cause: wrapped });

        if (attempt < retries) {
          await sleep(backoffMs(attempt), userSignal);
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timeoutId);
        userSignal?.removeEventListener('abort', onUserAbort);
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private resolveRetries(method: string, routeKey: string): number {
    const retries = this.options.retryPolicy?.({
      method,
      routeKey,
      defaultRetries: this.options.retries,
    });

    if (retries === undefined) return this.options.retries;
    return validateRetryCount(retries, 'Retry policy result');
  }
}
