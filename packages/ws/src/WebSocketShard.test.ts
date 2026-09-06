import { GatewayOpcodes } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { GatewayCloseCodes } from './Utils/Constants.js';
import {
  averageShardPings,
  narrowGatewayPayload,
  shouldReconnectOnClose,
  WebSocketShard,
} from './WebSocketShard.js';

class MockWebSocket {
  readyState = 1;
  // biome-ignore lint/complexity/noUselessConstructor: required WebSocket(url) signature for mocks
  constructor(_url: string) {}
  send(_data: string | ArrayBufferLike): void {}
  close(_code?: number): void {}
}

describe('narrowGatewayPayload', () => {
  it('returns null for non-objects', () => {
    expect(narrowGatewayPayload(null)).toBeNull();
    expect(narrowGatewayPayload('x')).toBeNull();
    expect(narrowGatewayPayload(1)).toBeNull();
  });

  it('requires numeric op', () => {
    expect(narrowGatewayPayload({ d: {} })).toBeNull();
    expect(narrowGatewayPayload({ op: '10' })).toBeNull();
  });

  it('narrows a valid payload once', () => {
    const payload = narrowGatewayPayload({
      op: GatewayOpcodes.HeartbeatAck,
      d: null,
      s: 3,
      t: null,
    });
    expect(payload).toEqual({ op: GatewayOpcodes.HeartbeatAck, d: null, s: 3 });
  });
});

describe('shouldReconnectOnClose', () => {
  it('reconnects on normal and abnormal closures', () => {
    expect(shouldReconnectOnClose(GatewayCloseCodes.Normal)).toBe(true);
    expect(shouldReconnectOnClose(GatewayCloseCodes.AbnormalClosure)).toBe(true);
    expect(shouldReconnectOnClose(1012)).toBe(true);
  });

  it('does not reconnect on auth/protocol fatals', () => {
    expect(shouldReconnectOnClose(GatewayCloseCodes.AuthenticationFailed)).toBe(false);
    expect(shouldReconnectOnClose(GatewayCloseCodes.ProtocolError)).toBe(false);
    expect(shouldReconnectOnClose(GatewayCloseCodes.DecodeError)).toBe(false);
  });

  it('reconnects on recoverable gateway codes', () => {
    expect(shouldReconnectOnClose(GatewayCloseCodes.SessionTimeout)).toBe(true);
    expect(shouldReconnectOnClose(GatewayCloseCodes.RateLimited)).toBe(true);
    expect(shouldReconnectOnClose(GatewayCloseCodes.AckBackpressure)).toBe(true);
  });

  it('does not reconnect on InvalidShard or ShardingRequired', () => {
    expect(shouldReconnectOnClose(GatewayCloseCodes.InvalidShard)).toBe(false);
    expect(shouldReconnectOnClose(GatewayCloseCodes.ShardingRequired)).toBe(false);
  });
});

describe('WebSocketShard', () => {
  it('emits error and debug when gateway sends GatewayError with string payload', () => {
    const shard = new WebSocketShard({
      url: 'wss://gateway.fluxer.app',
      token: 'test-token',
      shardId: 0,
      numShards: 1,
      WebSocket: MockWebSocket,
    });

    const onError = vi.fn();
    const onDebug = vi.fn();
    shard.on('error', onError);
    shard.on('debug', onDebug);

    shard.handlePayload({
      op: GatewayOpcodes.GatewayError,
      d: 'bad gateway state',
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(onError.mock.calls[0]?.[0]?.message ?? '')).toContain('bad gateway state');
    expect(onDebug).toHaveBeenCalledTimes(1);
    expect(String(onDebug.mock.calls[0]?.[0] ?? '')).toContain('Gateway error: bad gateway state');
  });

  it('does not emit debug when debug option is false', () => {
    const shard = new WebSocketShard({
      url: 'wss://gateway.fluxer.app',
      token: 'test-token',
      shardId: 0,
      numShards: 1,
      debug: false,
      WebSocket: MockWebSocket,
    });

    const onDebug = vi.fn();
    shard.on('debug', onDebug);
    shard.on('error', () => {});

    shard.handlePayload({
      op: GatewayOpcodes.GatewayError,
      d: 'ignored',
    });

    expect(onDebug).not.toHaveBeenCalled();
  });

  it('stringifies non-string GatewayError payloads', () => {
    const shard = new WebSocketShard({
      url: 'wss://gateway.fluxer.app',
      token: 'test-token',
      shardId: 0,
      numShards: 1,
      WebSocket: MockWebSocket,
    });

    const onError = vi.fn();
    shard.on('error', onError);

    shard.handlePayload({
      op: GatewayOpcodes.GatewayError,
      d: { code: 500, detail: 'oops' },
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(onError.mock.calls[0]?.[0]?.message ?? '')).toContain(
      '{"code":500,"detail":"oops"}',
    );
  });

  it('narrows gateway payloads after a single JSON.parse', () => {
    const parseSpy = vi.spyOn(JSON, 'parse');
    const raw = JSON.stringify({ op: GatewayOpcodes.HeartbeatAck });
    const once = JSON.parse(raw);
    expect(narrowGatewayPayload(once)?.op).toBe(GatewayOpcodes.HeartbeatAck);
    expect(parseSpy).toHaveBeenCalledTimes(1);
    parseSpy.mockRestore();
  });

  it('Reconnect opcode closes socket without double-scheduling connect', () => {
    const closes: number[] = [];
    class TrackingWS {
      readyState = 1;
      // biome-ignore lint/complexity/noUselessConstructor: required WebSocket(url) signature for mocks
      constructor(_url: string) {}
      send(): void {}
      close(code?: number): void {
        closes.push(code ?? 1000);
        this.readyState = 3;
      }
    }

    const shard = new WebSocketShard({
      url: 'wss://gateway.fluxer.app',
      token: 'test-token',
      shardId: 0,
      numShards: 1,
      WebSocket: TrackingWS,
    });

    (shard as unknown as { ws: TrackingWS }).ws = new TrackingWS('wss://x');
    shard.handlePayload({ op: GatewayOpcodes.Reconnect });
    expect(closes).toEqual([1000]);
  });

  it('HeartbeatAck clears the awaiting-ack flag', () => {
    const shard = new WebSocketShard({
      url: 'wss://gateway.fluxer.app',
      token: 'test-token',
      shardId: 0,
      numShards: 1,
      WebSocket: MockWebSocket,
    });

    (shard as unknown as { lastHeartbeatAck: boolean }).lastHeartbeatAck = false;
    shard.handlePayload({ op: GatewayOpcodes.HeartbeatAck });
    expect((shard as unknown as { lastHeartbeatAck: boolean }).lastHeartbeatAck).toBe(true);
  });

  it('records heartbeat ACK round-trip as ping', () => {
    class TrackingWS extends MockWebSocket {
      send = vi.fn();
    }

    const shard = new WebSocketShard({
      url: 'wss://gateway.fluxer.app',
      token: 'test-token',
      shardId: 0,
      numShards: 1,
      WebSocket: TrackingWS,
    });

    (shard as unknown as { ws: TrackingWS }).ws = new TrackingWS('wss://x');
    expect(shard.ping).toBe(-1);

    const now = vi.spyOn(Date, 'now');
    now.mockReturnValueOnce(1_000).mockReturnValueOnce(1_042);
    shard.handlePayload({ op: GatewayOpcodes.Heartbeat });
    shard.handlePayload({ op: GatewayOpcodes.HeartbeatAck });
    now.mockRestore();

    expect(shard.ping).toBe(42);
  });
});

describe('averageShardPings', () => {
  it('returns -1 when empty or all unknown', () => {
    expect(averageShardPings([])).toBe(-1);
    expect(averageShardPings([-1, -1])).toBe(-1);
  });

  it('averages known RTTs and skips -1', () => {
    expect(averageShardPings([10, 20])).toBe(15);
    expect(averageShardPings([10, -1, 30])).toBe(20);
  });
});
