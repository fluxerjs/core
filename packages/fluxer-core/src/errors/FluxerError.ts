export interface FluxerErrorOptions {
  code?: string;
  cause?: Error;
}

export class FluxerError extends Error {
  readonly code?: string;

  constructor(message: string, options?: FluxerErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'FluxerError';
    this.code = options?.code;
    Object.setPrototypeOf(this, FluxerError.prototype);
  }
}
