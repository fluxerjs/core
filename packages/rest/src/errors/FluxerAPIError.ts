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
}
