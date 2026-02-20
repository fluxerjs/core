const STATUS_MESSAGES: Record<number, string> = {
  502: 'Bad Gateway — Fluxer API may be temporarily unavailable.',
  503: 'Service Unavailable — Fluxer API is down or overloaded. Try again later.',
  504: 'Gateway Timeout — Fluxer API did not respond in time.',
};

export class HTTPError extends Error {
  readonly statusCode: number;
  readonly body: string | null;

  constructor(statusCode: number, body: string | null) {
    const hint = STATUS_MESSAGES[statusCode];
    const detail = body?.trim() || (hint ?? 'No body');
    super(`HTTP ${statusCode}: ${detail}`);
    this.name = 'HTTPError';
    this.statusCode = statusCode;
    this.body = body;
    Object.setPrototypeOf(this, HTTPError.prototype);
  }

  /** True if the error is retryable (429 rate limit, 5xx server errors). */
  get isRetryable(): boolean {
    return this.statusCode === 429 || (this.statusCode >= 500 && this.statusCode < 600);
  }
}
