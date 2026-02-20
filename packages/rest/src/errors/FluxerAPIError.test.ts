import { describe, it, expect } from 'vitest';
import { FluxerAPIError } from './FluxerAPIError.js';

describe('FluxerAPIError', () => {
  it('creates error with message from body', () => {
    const err = new FluxerAPIError({ message: 'Channel not found', code: 'CHANNEL_NOT_FOUND' }, 404);
    expect(err.message).toBe('Channel not found');
    expect(err.name).toBe('FluxerAPIError');
  });

  it('stores code and statusCode', () => {
    const err = new FluxerAPIError(
      { message: 'Rate limited', code: 'RATE_LIMITED' },
      429,
    );
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.statusCode).toBe(429);
  });

  it('stores optional errors field', () => {
    const errors = { field: ['invalid value'] };
    const err = new FluxerAPIError(
      { message: 'Validation failed', code: 'VALIDATION_ERROR', errors },
      400,
    );
    expect(err.errors).toEqual(errors);
  });

  it('isRetryable returns true for 429', () => {
    const err = new FluxerAPIError(
      { message: 'Rate limited', code: 'RATE_LIMITED' },
      429,
    );
    expect(err.isRetryable).toBe(true);
  });

  it('isRetryable returns true for 5xx', () => {
    expect(
      new FluxerAPIError({ message: 'Server error', code: 'INTERNAL' }, 500).isRetryable,
    ).toBe(true);
    expect(
      new FluxerAPIError({ message: 'Bad gateway', code: 'BAD_GATEWAY' }, 502).isRetryable,
    ).toBe(true);
    expect(
      new FluxerAPIError({ message: 'Unavailable', code: 'UNAVAILABLE' }, 503).isRetryable,
    ).toBe(true);
  });

  it('isRetryable returns false for 4xx (except 429)', () => {
    expect(
      new FluxerAPIError({ message: 'Not found', code: 'NOT_FOUND' }, 404).isRetryable,
    ).toBe(false);
    expect(
      new FluxerAPIError({ message: 'Forbidden', code: 'FORBIDDEN' }, 403).isRetryable,
    ).toBe(false);
    expect(
      new FluxerAPIError({ message: 'Bad request', code: 'BAD_REQUEST' }, 400).isRetryable,
    ).toBe(false);
  });
});
