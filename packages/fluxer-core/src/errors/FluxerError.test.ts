import { describe, it, expect } from 'vitest';
import { FluxerError } from './FluxerError.js';
import { ErrorCodes } from './ErrorCodes.js';

describe('FluxerError', () => {
  it('creates error with message', () => {
    const err = new FluxerError('Something went wrong');
    expect(err.message).toBe('Something went wrong');
    expect(err.name).toBe('FluxerError');
  });

  it('accepts code option', () => {
    const err = new FluxerError('Not found', { code: ErrorCodes.ChannelNotFound });
    expect(err.code).toBe(ErrorCodes.ChannelNotFound);
  });

  it('accepts cause option', () => {
    const cause = new Error('Original error');
    const err = new FluxerError('Wrapped', { cause });
    expect(err.cause).toBe(cause);
  });

  it('chains code and cause', () => {
    const cause = new Error('API 404');
    const err = new FluxerError('Channel not found', {
      code: ErrorCodes.ChannelNotFound,
      cause,
    });
    expect(err.code).toBe(ErrorCodes.ChannelNotFound);
    expect(err.cause).toBe(cause);
  });
});
