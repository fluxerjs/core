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

  it('averages available heartbeat latency samples', async () => {
    const manager = new WebSocketManager({
      token: 'test-token',
      intents: 0,
      rest: {
        get: vi.fn().mockResolvedValue({
          url: 'wss://gateway.fluxer.app',
          shards: 2,
          session_start_limit: {
            total: 1_000,
            remaining: 999,
            reset_after: 60_000,
            max_concurrency: 1,
          },
        }),
      },
      WebSocket: FakeWebSocket,
    });

    await manager.connect();
    const shards = (
      manager as unknown as {
        shards: Map<number, { _ping: number | null }>;
      }
    ).shards;

    expect(manager.ping).toBeNull();
    shards.get(0)!._ping = 20;
    expect(manager.ping).toBe(20);
    shards.get(1)!._ping = 40;
    expect(manager.ping).toBe(30);

    manager.destroy();
    expect(manager.ping).toBeNull();
  });
});
