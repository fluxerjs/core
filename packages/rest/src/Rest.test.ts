import { Routes } from '@fluxerjs/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedFetch } from './Fetch/SharedFetch.js';
import { REST } from './Rest.js';

vi.mock('./Fetch/SharedFetch.js', () => ({
  sharedFetch: vi.fn(),
  closeSharedFetch: vi.fn(),
}));

const fetchMock = vi.mocked(sharedFetch);

describe('REST', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('constructor and setToken', () => {
    const rest = new REST();
    expect(rest.token).toBeNull();
    rest.setToken('abc123');
    expect(rest.token).toBe('abc123');
    rest.setToken(null);
    expect(rest.token).toBeNull();
  });

  it('setToken returns this for chaining', () => {
    const rest = new REST();
    expect(rest.setToken('x')).toBe(rest);
  });

  it('get delegates to requestManager', async () => {
    const rest = new REST();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"id":"1"}'),
      headers: new Headers(),
    } as unknown as Response);
    const result = await rest.get('/channels/1');
    expect(result).toEqual({ id: '1' });
  });

  it('post sends body', async () => {
    const rest = new REST();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
      headers: new Headers(),
    } as unknown as Response);
    await rest.post('/channels', { body: { name: 'test' } });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: '{"name":"test"}',
      }),
    );
  });

  it('passes the request retry policy to the request manager', async () => {
    const retryPolicy = vi.fn(() => 0);
    const rest = new REST({ retries: 3, retryPolicy });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('unavailable'),
      headers: new Headers(),
    } as unknown as Response);

    await expect(rest.post('/channels/1/messages', { body: { content: 'hello' } })).rejects.toThrow(
      'HTTP 503',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(retryPolicy).toHaveBeenCalledOnce();
  });

  it('Routes is exposed', () => {
    expect(REST.Routes).toBe(Routes);
  });

  it('baseUrl is versioned; well-known GET is not', async () => {
    const rest = new REST({ api: 'https://fluxer.app' });
    expect(rest.baseUrl).toBe('https://fluxer.app/v1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
      headers: new Headers(),
    } as unknown as Response);
    await rest.get('/.well-known/fluxer', { auth: false });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://fluxer.app/.well-known/fluxer');
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('/v1/');
  });

  it('sends Accept-Language from locale option', async () => {
    const rest = new REST({ locale: 'ja' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
      headers: new Headers(),
    } as unknown as Response);
    await rest.get('/gateway/bot');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Accept-Language': 'ja' }),
      }),
    );
  });
});
