import { RateLimitManager } from './RateLimitManager.js';
import { FluxerAPIError, RateLimitError, HTTPError } from './errors/index.js';
import { APIErrorBody, RateLimitErrorBody } from '@fluxerjs/types';
import { buildFormData } from './utils/files.js';

export interface RequestOptions {
  body?: unknown | FormData;
  headers?: Record<string, string>;
  files?: Array<{
    name: string;
    data: Blob | ArrayBuffer | Uint8Array | Buffer;
    filename?: string;
  }>;
  auth?: boolean;
}

export interface RestOptions {
  api: string;
  version: string;
  authPrefix: 'Bot' | 'Bearer';
  timeout: number;
  retries: number;
  userAgent: string;
}

export class RequestManager {
  private token: string | null = null;
  private readonly options: RestOptions;
  private readonly rateLimiter = new RateLimitManager();

  constructor(options: Partial<RestOptions>) {
    this.options = {
      api: options.api ?? 'https://api.fluxer.app',
      version: options.version ?? '1',
      authPrefix: options.authPrefix ?? 'Bot',
      timeout: options.timeout ?? 15000,
      retries: options.retries ?? 3,
      userAgent: options.userAgent ?? 'fluxerjs',
    };
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  get baseUrl(): string {
    return `${this.options.api}/v${this.options.version}`;
  }

  /** Hash route for rate limit bucket (use path without ids for grouping). */
  private getRouteHash(route: string): string {
    return route.replace(/\d{17,19}/g, ':id');
  }

  private async waitForRateLimit(routeHash: string): Promise<void> {
    const wait = this.rateLimiter.getWaitTime(routeHash);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  private buildHeaders(
    _route: string,
    options: RequestOptions,
    body: string | FormData | undefined,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.options.userAgent,
      ...options.headers,
    };
    if (options.auth !== false && this.token) {
      headers['Authorization'] = `${this.options.authPrefix} ${this.token}`;
    }
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async request<T>(method: string, route: string, options: RequestOptions = {}): Promise<T> {
    const routeHash = this.getRouteHash(route);
    const url = route.startsWith('http') ? route : `${this.baseUrl}${route}`;

    await this.waitForRateLimit(routeHash);

    let body: string | FormData | undefined;
    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        body = options.body;
      } else if (
        options.files?.length &&
        typeof options.body === 'object' &&
        options.body !== null
      ) {
        body = buildFormData(options.body as Record<string, unknown>, options.files);
      } else {
        body = JSON.stringify(options.body);
      }
    }

    const headers = this.buildHeaders(route, options, body);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        this.rateLimiter.updateFromHeaders(routeHash, response.headers);

        if (response.status === 429) {
          const data = (await response.json().catch(() => ({}))) as RateLimitErrorBody;
          const retryAfter =
            (data.retry_after ?? parseInt(response.headers.get('Retry-After') ?? '0', 10)) * 1000;
          this.rateLimiter.setBucket(routeHash, 1, 0, Date.now() + retryAfter);
          if (data.global) this.rateLimiter.setGlobalReset(Date.now() + retryAfter);
          throw new RateLimitError(
            {
              ...data,
              code: 'RATE_LIMITED',
              message: data.message ?? 'Rate limited',
              retry_after: data.retry_after ?? 0,
            },
            response.status,
          );
        }

        const text = await response.text();
        if (!response.ok) {
          let parsed: APIErrorBody;
          try {
            parsed = JSON.parse(text) as APIErrorBody;
          } catch {
            throw new HTTPError(response.status, text);
          }
          throw new FluxerAPIError(parsed, response.status);
        }

        if (response.status === 204 || text.length === 0) return undefined as T;
        return JSON.parse(text) as T;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        lastError =
          attempt > 0
            ? new Error(`Retry ${attempt} failed: ${wrapped.message}`, {
                cause: wrapped,
              })
            : wrapped;
        if (err instanceof RateLimitError && attempt < this.options.retries) {
          const retryMs = err.retryAfter * 1000;
          if (Number.isFinite(retryMs)) {
            await new Promise((r) => setTimeout(r, retryMs));
            continue;
          }
        }
        if (err instanceof FluxerAPIError || err instanceof HTTPError) throw err;
        if (attempt < this.options.retries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError ?? new Error('Request failed');
  }
}
