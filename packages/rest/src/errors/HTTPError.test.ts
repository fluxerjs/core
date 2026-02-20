import { describe, it, expect } from 'vitest';
import { HTTPError } from './HTTPError.js';

describe('HTTPError', () => {
  it('creates error with status and body', () => {
    const err = new HTTPError(404, '{"error":"not found"}');
    expect(err.message).toContain('404');
    expect(err.message).toContain('not found');
    expect(err.name).toBe('HTTPError');
  });

  it('stores statusCode and body', () => {
    const err = new HTTPError(500, 'Internal Server Error');
    expect(err.statusCode).toBe(500);
    expect(err.body).toBe('Internal Server Error');
  });

  it('accepts null body', () => {
    const err = new HTTPError(502, null);
    expect(err.body).toBeNull();
    expect(err.message).toContain('502');
  });

  it('uses status hint when body is empty', () => {
    const err = new HTTPError(503, '');
    expect(err.message).toContain('Service Unavailable');
  });

  it('isRetryable returns true for 429', () => {
    const err = new HTTPError(429, 'Too Many Requests');
    expect(err.isRetryable).toBe(true);
  });

  it('isRetryable returns true for 5xx', () => {
    expect(new HTTPError(500, '').isRetryable).toBe(true);
    expect(new HTTPError(502, '').isRetryable).toBe(true);
    expect(new HTTPError(503, '').isRetryable).toBe(true);
    expect(new HTTPError(504, '').isRetryable).toBe(true);
  });

  it('isRetryable returns false for 4xx (except 429)', () => {
    expect(new HTTPError(400, '').isRetryable).toBe(false);
    expect(new HTTPError(403, '').isRetryable).toBe(false);
    expect(new HTTPError(404, '').isRetryable).toBe(false);
  });
});
