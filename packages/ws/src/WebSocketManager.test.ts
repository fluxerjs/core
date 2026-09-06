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

  it('ping is -1 before a strategy connects', () => {
    const manager = new WebSocketManager({
      token: 'test-token',
      rest: { get: vi.fn() },
      WebSocket: FakeWebSocket,
    });
    expect(manager.ping).toBe(-1);
  });
});
