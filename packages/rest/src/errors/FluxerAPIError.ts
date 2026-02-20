import type { APIErrorBody } from '@fluxerjs/types';

export class FluxerAPIError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly errors?: APIErrorBody['errors'];

  constructor(body: APIErrorBody, statusCode: number) {
    super(body.message);
    this.name = 'FluxerAPIError';
    this.code = body.code;
    this.statusCode = statusCode;
    this.errors = body.errors;
    Object.setPrototypeOf(this, FluxerAPIError.prototype);
  }

  /** True if the error is retryable (429 rate limit, 5xx server errors). */
  get isRetryable(): boolean {
    return this.statusCode === 429 || (this.statusCode >= 500 && this.statusCode < 600);
  }
}
