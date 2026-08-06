import { describe, expect, it, vi } from 'vitest';
import { type WebSocketConstructor, WebSocketManager } from './WebSocketManager.js';

const FakeWebSocket = class {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 0;
  close = vi.fn();
  send = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
} as unknown as WebSocketConstructor;

describe('WebSocketManager.connect', () => {
  it('rejects immediately on non-retryable REST errors instead of looping', async () => {
    const fatal = Object.assign(new Error('Unauthorized'), {
      name: 'FluxerAPIError',
      statusCode: 401,
      isRetryable: false,
    });
    const get = vi.fn().mockRejectedValue(fatal);
    const manager = new WebSocketManager({
      token: 'test-token',
      rest: { get },
      WebSocket: FakeWebSocket,
    });

    const errors: Error[] = [];
    manager.on('error', ({ error }: { error: Error }) => {
      errors.push(error);
    });

    await expect(manager.connect()).rejects.toBe(fatal);
    expect(get).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(fatal);
  });

  it('cancels retry backoff immediately when destroyed', async () => {
    const get = vi.fn().mockRejectedValue(new Error('gateway unavailable'));
    const manager = new WebSocketManager({
      token: 'test-token',
      intents: 0,
      rest: { get },
      WebSocket: FakeWebSocket,
    });
    manager.on('error', () => undefined);

    const connecting = manager.connect();
    while (get.mock.calls.length === 0) await Promise.resolve();
    manager.destroy();

    await expect(connecting).rejects.toMatchObject({
      code: 'GATEWAY_CONNECTION_ABORTED',
    });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('stops a retry loop when a newer connect supersedes it', async () => {
    let resolveGateway!: (value: { url: string; shards: number }) => void;
    const gateway = new Promise<{ url: string; shards: number }>((resolve) => {
      resolveGateway = resolve;
    });
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('gateway unavailable'))
      .mockImplementation(() => gateway);
    const manager = new WebSocketManager({
      token: 'test-token',
      intents: 0,
      rest: { get },
      WebSocket: FakeWebSocket,
    });
    manager.on('error', () => undefined);

    const first = manager.connect();
    while (get.mock.calls.length === 0) await Promise.resolve();
    const second = manager.connect();

    await expect(first).rejects.toMatchObject({
      code: 'GATEWAY_CONNECTION_ABORTED',
    });
    expect(get).toHaveBeenCalledTimes(2);

    manager.destroy();
    resolveGateway({ url: 'wss://gateway.example', shards: 1 });
    await expect(second).rejects.toMatchObject({
      code: 'GATEWAY_CONNECTION_ABORTED',
    });
  });

  it('destroys existing shards before reconnecting', async () => {
    const sockets: Array<{ close: ReturnType<typeof vi.fn> }> = [];
    const TrackingWebSocket = class {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 0;
      close = vi.fn();
      send = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();

      constructor(_url: string) {
        sockets.push(this);
      }
    } as unknown as WebSocketConstructor;
    const manager = new WebSocketManager({
      token: 'test-token',
      intents: 0,
      rest: {
        get: vi.fn().mockResolvedValue({ url: 'wss://gateway.example', shards: 1 }),
      },
      WebSocket: TrackingWebSocket,
    });

    await manager.connect();
    await manager.connect();

    expect(sockets).toHaveLength(2);
    expect(sockets[0]?.close).toHaveBeenCalledWith(1000);

    manager.destroy();
  });
});
