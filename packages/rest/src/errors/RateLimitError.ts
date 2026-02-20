import { RateLimitErrorBody } from '@fluxerjs/types';
import { FluxerAPIError } from './FluxerAPIError.js';

export class RateLimitError extends FluxerAPIError {
  readonly retryAfter: number;
  readonly global: boolean;

  constructor(body: RateLimitErrorBody, statusCode: number) {
    super(body, statusCode);
    this.retryAfter = body.retry_after;
    this.global = body.global ?? false;
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}
