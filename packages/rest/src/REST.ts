import { EventEmitter } from 'events';
import { RequestManager } from './RequestManager.js';
import { Routes } from '@fluxerjs/types';

/** Options for the REST client. */
export interface RESTOptions {
  api?: string;
  version?: string;
  authPrefix?: 'Bot' | 'Bearer';
  timeout?: number;
  retries?: number;
  userAgent?: string;
}

/** HTTP client for the Fluxer API. Used by Client internally. */
export class REST extends EventEmitter {
  private readonly requestManager: RequestManager;
  private _token: string | null = null;

  constructor(options: RESTOptions = {}) {
    super();
    this.requestManager = new RequestManager({
      api: options.api ?? 'https://api.fluxer.app',
      version: options.version ?? '1',
      authPrefix: options.authPrefix ?? 'Bot',
      timeout: options.timeout ?? 15000,
      retries: options.retries ?? 3,
      userAgent: options.userAgent ?? 'fluxerjs',
    });
  }

  /** Set the bot token for authenticated requests. */
  setToken(token: string | null): this {
    this._token = token;
    this.requestManager.setToken(token);
    return this;
  }

  /** Current bot token, or null. */
  get token(): string | null {
    return this._token;
  }

  /** Send a GET request. */
  async get<T>(route: string, options?: { auth?: boolean }): Promise<T> {
    return this.requestManager.request<T>('GET', route, { auth: options?.auth });
  }

  /** Send a POST request. */
  async post<T>(route: string, options?: { body?: unknown; auth?: boolean; files?: Array<{ name: string; data: Blob | ArrayBuffer | Uint8Array; filename?: string }> }): Promise<T> {
    return this.requestManager.request<T>('POST', route, {
      body: options?.body,
      auth: options?.auth,
      files: options?.files,
    });
  }

  /** Send a PATCH request. */
  async patch<T>(route: string, options?: { body?: unknown; auth?: boolean }): Promise<T> {
    return this.requestManager.request<T>('PATCH', route, { body: options?.body, auth: options?.auth });
  }

  /** Send a PUT request. */
  async put<T>(route: string, options?: { body?: unknown; auth?: boolean }): Promise<T> {
    return this.requestManager.request<T>('PUT', route, { body: options?.body, auth: options?.auth });
  }

  /** Send a DELETE request. */
  async delete<T>(route: string, options?: { auth?: boolean }): Promise<T> {
    return this.requestManager.request<T>('DELETE', route, { auth: options?.auth });
  }

  /** Route helpers (from @fluxerjs/types) for building paths. */
  static get Routes(): typeof Routes {
    return Routes;
  }
}
