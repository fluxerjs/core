import { FormData } from 'undici';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FluxerAPIError, HTTPError, RateLimitError } from './errors/index.js';
import { sharedFetch } from './fetch/sharedFetch.js';
import { RequestManager } from './RequestManager.js';

vi.mock('./fetch/sharedFetch.js', () => ({
  sharedFetch: vi.fn(),
  closeSharedFetch: vi.fn(),
}));

const fetchMock = vi.mocked(sharedFetch);

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    text: () => Promise.resolve(text),
    headers: new Headers({
      'Content-Type': 'application/json',
      ...init.headers,
    }),
  } as unknown as Response;
}

describe('RequestManager', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it('constructor uses defaults', () => {
    const rm = new RequestManager({});
    expect(rm.baseUrl).toBe('https://api.fluxer.app/v1');
  });

  it('constructor accepts overrides', () => {
    const rm = new RequestManager({ api: 'https://test', version: '2' });
    expect(rm.baseUrl).toBe('https://test/v2');
  });

  it('request succeeds with JSON body', async () => {
    const rm = new RequestManager({ retries: 0 });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: '123' }));
    const result = await rm.request('GET', '/channels/123');
    expect(result).toEqual({ id: '123' });
  });

  it('request returns undefined for 204', async () => {
    const rm = new RequestManager({ retries: 0 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
      headers: new Headers(),
    } as unknown as Response);
    const result = await rm.request('DELETE', '/channels/123');
    expect(result).toBeUndefined();
  });

  it('request throws FluxerAPIError with a sanitized path', async () => {
    const rm = new RequestManager({ retries: 0 });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'UNKNOWN_CHANNEL', message: 'Unknown Channel' }, { status: 404 }),
    );
    const token = 'secret-webhook-token';
    const error = await rm
      .request('GET', `/webhooks/123456789012345678/${token}?signature=secret`)
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(FluxerAPIError);
    expect((error as FluxerAPIError).path).toBe('/webhooks/123456789012345678/:token');
  });

  it('request throws HTTPError for non-JSON error body', async () => {
    const rm = new RequestManager({ retries: 0 });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
      headers: new Headers(),
    } as unknown as Response);
    await expect(rm.request('GET', '/channels/1')).rejects.toThrow(HTTPError);
  });

  it('retries retryable 5xx HTTPError then succeeds', async () => {
    const rm = new RequestManager({ retries: 2 });
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('unavailable'),
        headers: new Headers(),
      } as unknown as Response)
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const result = await rm.request('GET', '/channels/1');
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries RateLimitError then succeeds', async () => {
    const rm = new RequestManager({ retries: 1 });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { code: 'RATE_LIMITED', message: 'slow down', retry_after: 0 },
          { status: 429, headers: { 'Retry-After': '0' } },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ id: '1' }));
    const result = await rm.request('GET', '/channels/1');
    expect(result).toEqual({ id: '1' });
  });

  it('throws RateLimitError when retries exhausted', async () => {
    const rm = new RequestManager({ retries: 0 });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'RATE_LIMITED', message: 'slow down', retry_after: 1 }, { status: 429 }),
    );
    await expect(rm.request('GET', '/channels/1')).rejects.toThrow(RateLimitError);
  });

  it('uses a request retry policy without changing the configured default', async () => {
    const retryPolicy = vi.fn(
      ({ method, defaultRetries }: { method: string; defaultRetries: number }) =>
        method === 'POST' ? 0 : defaultRetries,
    );
    const rm = new RequestManager({ retries: 1, retryPolicy });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'RATE_LIMITED', message: 'slow down', retry_after: 0 }, { status: 429 }),
    );

    await expect(rm.request('POST', '/channels/123456789012345678/messages')).rejects.toThrow(
      RateLimitError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(retryPolicy).toHaveBeenCalledOnce();
    expect(retryPolicy).toHaveBeenCalledWith({
      method: 'POST',
      routeKey: '/channels/:id/messages',
      defaultRetries: 1,
    });
  });

  it('redacts credential-bearing route data from the retry policy context', async () => {
    const retryPolicy = vi.fn(() => 0);
    const rm = new RequestManager({ retryPolicy });
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const webhookToken = 'validation-only-secret-token';

    await rm.request(
      'POST',
      `/webhooks/123456789012345678/${webhookToken}/messages/987654321098765432`,
    );
    expect(retryPolicy).toHaveBeenLastCalledWith({
      method: 'POST',
      routeKey: '/webhooks/:id/:token/messages/:id',
      defaultRetries: 3,
    });
    expect(JSON.stringify(retryPolicy.mock.lastCall)).not.toContain(webhookToken);

    await rm.request(
      'GET',
      '/users/123456789012345678/profile?guild_id=987654321098765432&token=query-secret',
    );
    expect(retryPolicy).toHaveBeenLastCalledWith({
      method: 'GET',
      routeKey: '/users/:id/profile',
      defaultRetries: 3,
    });
    expect(JSON.stringify(retryPolicy.mock.lastCall)).not.toContain('query-secret');

    await rm.request(
      'GET',
      `/users/123456789012345678/profile#${'#'.repeat(256)}\nfragment-secret`,
    );
    expect(retryPolicy).toHaveBeenLastCalledWith({
      method: 'GET',
      routeKey: '/users/:id/profile',
      defaultRetries: 3,
    });
    expect(JSON.stringify(retryPolicy.mock.lastCall)).not.toContain('fragment-secret');

    await rm.request(
      'GET',
      'https://user:password@cdn.example.com/private/path?signature=external-secret',
    );
    expect(retryPolicy).toHaveBeenLastCalledWith({
      method: 'GET',
      routeKey: 'https://cdn.example.com/:external',
      defaultRetries: 3,
    });
    expect(JSON.stringify(retryPolicy.mock.lastCall)).not.toMatch(
      /password|private|external-secret/,
    );
  });

  it('keeps the safe-method default when the retry policy returns undefined', async () => {
    const retryPolicy = vi.fn(() => undefined);
    const rm = new RequestManager({ retries: 1, retryPolicy });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { code: 'RATE_LIMITED', message: 'slow down', retry_after: 0 },
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ id: '1' }));

    await expect(rm.request('GET', '/channels/1/messages')).resolves.toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retryPolicy).toHaveBeenCalledOnce();
  });

  it('keeps mutations at zero retries when the retry policy returns undefined', async () => {
    const rm = new RequestManager({ retries: 3, retryPolicy: () => undefined });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'RATE_LIMITED', message: 'slow down', retry_after: 0 }, { status: 429 }),
    );

    await expect(rm.request('POST', '/channels/1/messages')).rejects.toThrow(RateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry mutations by default', async () => {
    const rm = new RequestManager({ retries: 3 });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('unavailable'),
      headers: new Headers(),
    } as unknown as Response);

    await expect(rm.request('POST', '/channels/1/messages')).rejects.toThrow(HTTPError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('can suppress retries for transport failures', async () => {
    const rm = new RequestManager({ retries: 3, retryPolicy: () => 0 });
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(rm.request('POST', '/channels/1/messages')).rejects.toThrow('fetch failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('can suppress retries after a client timeout', async () => {
    vi.useFakeTimers();
    try {
      const rm = new RequestManager({ timeout: 10, retries: 3, retryPolicy: () => 0 });
      fetchMock.mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            const signal = init?.signal as AbortSignal;
            signal.addEventListener(
              'abort',
              () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
              { once: true },
            );
          }),
      );

      const rejection = expect(rm.request('POST', '/channels/1/messages')).rejects.toMatchObject({
        name: 'AbortError',
      });
      await vi.advanceTimersByTimeAsync(10);
      await rejection;

      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('selects retry budgets independently by request method', async () => {
    const rm = new RequestManager({
      retries: 1,
      retryPolicy: ({ method, defaultRetries }) => (method === 'POST' ? 0 : defaultRetries),
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ code: 'RATE_LIMITED', message: 'slow down', retry_after: 0 }, { status: 429 }),
    );
    await expect(rm.request('POST', '/channels/1/messages')).rejects.toThrow(RateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { code: 'RATE_LIMITED', message: 'slow down', retry_after: 0 },
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ id: '1' }));
    await expect(rm.request('GET', '/channels/1')).resolves.toEqual({ id: '1' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects invalid retry policy result %s before dispatch', async (retries) => {
    const rm = new RequestManager({ retryPolicy: () => retries });

    await expect(rm.request('GET', '/channels/1')).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects invalid configured retry count %s', (retries) => {
    expect(() => new RequestManager({ retries })).toThrow(RangeError);
  });

  it('builds multipart when files provided without body', async () => {
    const rm = new RequestManager({ retries: 0 });
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'm1' }));
    await rm.request('POST', '/channels/1/messages', {
      files: [{ name: 'a.txt', data: new Uint8Array([1]) }],
    });
    const init = fetchMock.mock.calls[0]?.[1] as { body: FormData };
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('payload_json')).toBeTruthy();
    expect(init.body.get('files[0]')).toBeTruthy();
  });

  it('omits auth on external URLs unless explicitly requested', async () => {
    const rm = new RequestManager({ retries: 0 });
    rm.setToken('bot-token');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await rm.request('GET', 'https://cdn.example.com/asset/123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/asset/123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.not.objectContaining({ Authorization: expect.anything() }),
      }),
    );

    await rm.request('GET', 'https://api.fluxer.app/v1/gateway');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://api.fluxer.app/v1/gateway',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bot bot-token' }),
      }),
    );

    await rm.request('GET', 'https://cdn.example.com/private', { auth: true });
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://cdn.example.com/private',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bot bot-token' }),
      }),
    );
  });

  it('request aborts when signal is aborted before fetch', async () => {
    const rm = new RequestManager({ retries: 3 });
    const ac = new AbortController();
    ac.abort();
    await expect(rm.request('GET', '/channels/1', { signal: ac.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('request does not retry on user AbortError from fetch', async () => {
    const rm = new RequestManager({ retries: 3 });
    const ac = new AbortController();
    fetchMock.mockImplementationOnce(() => {
      ac.abort();
      return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    });
    await expect(rm.request('GET', '/channels/1', { signal: ac.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces nested fetch cause in retry errors', async () => {
    const rm = new RequestManager({ retries: 1 });
    const root = Object.assign(new Error('invalid onRequestStart method'), {
      code: 'UND_ERR_INVALID_ARG',
    });
    const mid = new TypeError('fetch failed', { cause: root });
    fetchMock.mockRejectedValue(mid);
    await expect(rm.request('GET', '/gateway/bot')).rejects.toThrow(
      /Retry 1 failed: fetch failed: invalid onRequestStart method/,
    );
  });

  it('getRouteHash LRU keeps repeatedly used route when cache is full', () => {
    const rm = new RequestManager({});
    const getRouteHash = (
      rm as unknown as { getRouteHash: (method: string, route: string) => string }
    ).getRouteHash.bind(rm);
    const hot = '/channels/11111111111111111';
    for (let i = 0; i < 1000; i++) {
      getRouteHash('GET', `/channels/${100000000000000000n + BigInt(i)}`);
    }
    getRouteHash('GET', hot);
    getRouteHash('GET', hot);
    for (let i = 0; i < 999; i++) {
      getRouteHash('GET', `/guilds/${200000000000000000n + BigInt(i)}`);
    }
    expect(getRouteHash('GET', hot)).toBe(`GET ${hot}`);
    expect(getRouteHash('POST', hot)).toBe(`POST ${hot}`);
    expect(getRouteHash('GET', '/channels/22222222222222222')).not.toBe(`GET ${hot}`);
  });
});
