import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API,
  DEFAULT_LOCALE,
  DEFAULT_USER_AGENT,
  DEFAULT_VERSION,
  MAX_RETRIES,
  REQUEST_TIMEOUT,
} from './Constants.js';

describe('rest constants', () => {
  it('DEFAULT_API points to Fluxer API', () => {
    expect(DEFAULT_API).toBe('https://api.fluxer.app');
  });

  it('DEFAULT_LOCALE is en-US', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
  });

  it('DEFAULT_VERSION is 1', () => {
    expect(DEFAULT_VERSION).toBe('1');
  });

  it('DEFAULT_USER_AGENT contains fluxerjs', () => {
    expect(DEFAULT_USER_AGENT).toContain('fluxerjs');
    expect(DEFAULT_USER_AGENT).toContain('github.com/fluxerjs');
  });

  it('REQUEST_TIMEOUT is 15 seconds', () => {
    expect(REQUEST_TIMEOUT).toBe(15000);
  });

  it('MAX_RETRIES is 3', () => {
    expect(MAX_RETRIES).toBe(3);
  });
});
