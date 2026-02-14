export class FluxerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluxerError';
    Object.setPrototypeOf(this, FluxerError.prototype);
  }
}
