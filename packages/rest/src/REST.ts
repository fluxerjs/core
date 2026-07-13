import { EventEmitter } from 'events';
import { Routes } from '@fluxerjs/types';
import { RequestManager, type RequestOptions, type RetryPolicy } from './RequestManager.js';
import {
  DEFAULT_API,
  DEFAULT_USER_AGENT,
  DEFAULT_VERSION,
  MAX_RETRIES,
  REQUEST_TIMEOUT,
} from './utils/constants.js';

export interface RESTOptions {
  api?: string;
  version?: string;
  authPrefix?: 'Bot' | 'Bearer';
  timeout?: number;
  retries?: number;
  /** Select the retry budget for each logical request. */
  retryPolicy?: RetryPolicy;
  userAgent?: string;
}

/** HTTP client for the Fluxer API. */
export class REST extends EventEmitter {
  private readonly requestManager: RequestManager;

  constructor(options: RESTOptions = {}) {
    super();
    this.setMaxListeners(0);
    this.requestManager = new RequestManager({
      api: options.api ?? DEFAULT_API,
      version: options.version ?? DEFAULT_VERSION,
      authPrefix: options.authPrefix ?? 'Bot',
      timeout: options.timeout ?? REQUEST_TIMEOUT,
      retries: options.retries ?? MAX_RETRIES,
      ...(options.retryPolicy ? { retryPolicy: options.retryPolicy } : {}),
      userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
    });
  }

  setToken(token: string | null): this {
    this.requestManager.setToken(token);
    return this;
  }

  get token(): string | null {
    return this.requestManager.getToken();
  }

  async get<T>(
    route: string,
    options?: Pick<RequestOptions, 'auth' | 'signal' | 'headers'>,
  ): Promise<T> {
    return this.requestManager.request<T>('GET', route, options);
  }

  async post<T>(route: string, options?: RequestOptions): Promise<T> {
    return this.requestManager.request<T>('POST', route, options);
  }

  async patch<T>(route: string, options?: RequestOptions): Promise<T> {
    return this.requestManager.request<T>('PATCH', route, options);
  }

  async put<T>(route: string, options?: RequestOptions): Promise<T> {
    return this.requestManager.request<T>('PUT', route, options);
  }

  async delete<T>(route: string, options?: RequestOptions): Promise<T> {
    return this.requestManager.request<T>('DELETE', route, options);
  }

  static get Routes(): typeof Routes {
    return Routes;
  }
}
