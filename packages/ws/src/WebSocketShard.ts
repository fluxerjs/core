import { EventEmitter } from 'node:events';
import type {
  GatewayDispatchEventName,
  GatewayHelloData,
  GatewayIdentifyData,
  GatewayPresenceUpdateData,
  GatewayReceivePayload,
  GatewayResumeData,
  GatewaySendPayload,
} from '@fluxerjs/types';
import { GatewayOpcodes } from '@fluxerjs/types';
import { GatewayCloseCodes } from './Utils/Constants.js';
import { getDefaultWebSocketSync } from './Utils/GetWebSocket.js';

export type WebSocketLike = {
  send(data: string | ArrayBufferLike): void;
  close(code?: number): void;
  readyState: number;
  addEventListener?(type: string, listener: (e: unknown) => void): void;
  on?(event: string, cb: (data?: unknown) => void): void;
};
export type WebSocketConstructor = new (url: string) => WebSocketLike;

export interface WebSocketShardOptions {
  url: string;
  token: string;
  /** Legacy intents; Fluxer ignores — send `0`. */
  intents?: number;
  /** Identify `flags`. */
  flags?: number;
  /** Identify `ignored_events`. */
  ignoredEvents?: string[];
  /** Identify `initial_guild_id`. */
  initialGuildId?: string;
  presence?: GatewayPresenceUpdateData;
  shardId: number;
  numShards: number;
  /** Gateway API version (e.g. "1"). Defaults to `"1"`. */
  version?: string;
  /** When `false`, debug events are suppressed. Default: `true`. */
  debug?: boolean;
  WebSocket?: WebSocketConstructor;
}

const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 45_000;

const FATAL_CLOSE = new Set<number>([
  GatewayCloseCodes.ProtocolError,
  GatewayCloseCodes.UnsupportedData,
  GatewayCloseCodes.UnknownOpcode,
  GatewayCloseCodes.DecodeError,
  GatewayCloseCodes.NotAuthenticated,
  GatewayCloseCodes.AuthenticationFailed,
  GatewayCloseCodes.AlreadyAuthenticated,
]);

const RECOVERABLE_GATEWAY = new Set<number>([
  GatewayCloseCodes.UnknownError,
  GatewayCloseCodes.InvalidSeq,
  GatewayCloseCodes.RateLimited,
  GatewayCloseCodes.SessionTimeout,
  GatewayCloseCodes.InvalidShard,
  GatewayCloseCodes.ShardingRequired,
  GatewayCloseCodes.InvalidAPIVersion,
  GatewayCloseCodes.AckBackpressure,
]);

/** Narrow a single JSON-parsed value into a gateway receive payload. */
export function narrowGatewayPayload(value: unknown): GatewayReceivePayload | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.op !== 'number') return null;
  const payload: GatewayReceivePayload = { op: record.op as GatewayOpcodes };
  if ('d' in record) payload.d = record.d;
  if (typeof record.s === 'number') payload.s = record.s;
  if (typeof record.t === 'string') payload.t = record.t as GatewayDispatchEventName;
  return payload;
}

/** Exported for unit tests. */
export function shouldReconnectOnClose(code: number): boolean {
  if (FATAL_CLOSE.has(code)) return false;
  return code < 4000 || RECOVERABLE_GATEWAY.has(code);
}

function asError(err: unknown, fallback = 'WebSocket error'): Error {
  return err instanceof Error ? err : new Error(err === undefined ? fallback : String(err));
}

function messageDataToString(data: unknown): string {
  if (typeof data === 'string') return data;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data);
  }
  if (typeof data === 'object' && data !== null && 'data' in data) {
    const nested = (data as { data: unknown }).data;
    if (nested !== undefined) return messageDataToString(nested);
  }
  throw new TypeError('Unsupported WebSocket message data');
}

function closeCodeFromEvent(event: unknown): number {
  if (typeof event === 'object' && event !== null && 'code' in event) {
    const code = (event as { code: unknown }).code;
    if (typeof code === 'number') return code;
  }
  return 1006;
}

function narrowHelloData(value: unknown): GatewayHelloData | null {
  if (typeof value !== 'object' || value === null) return null;
  const interval = (value as { heartbeat_interval?: unknown }).heartbeat_interval;
  if (typeof interval !== 'number' || !Number.isFinite(interval)) return null;
  return { heartbeat_interval: interval };
}

function narrowSessionId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const id = (value as { session_id?: unknown }).session_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

function formatGatewayErrorDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'unknown gateway error';
  try {
    return JSON.stringify(value);
  } catch {
    return 'unknown gateway error';
  }
}

/** Idle → Connecting → Open → Idle; destroy() → Destroyed. */
const Phase = { Idle: 0, Connecting: 1, Open: 2, Destroyed: 3 } as const;
type Phase = (typeof Phase)[keyof typeof Phase];

export class WebSocketShard extends EventEmitter {
  private ws: WebSocketLike | null = null;
  private readonly options: WebSocketShardOptions;
  private readonly debugEnabled: boolean;
  private readonly url: string;
  private readonly WS: WebSocketConstructor;

  private phase: Phase = Phase.Idle;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  /** True until a heartbeat is sent; cleared by HeartbeatAck. */
  private lastHeartbeatAck = true;
  private heartbeatSentAt: number | null = null;
  private _ping: number | null = null;
  private sessionId: string | null = null;
  private seq: number | null = null;
  private reconnectDelayMs = RECONNECT_INITIAL_MS;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: WebSocketShardOptions) {
    super();
    this.options = options;
    this.debugEnabled = options.debug !== false;
    this.WS = options.WebSocket ?? getDefaultWebSocketSync();
    this.url = `${options.url}?${new URLSearchParams({ v: options.version ?? '1', encoding: 'json' })}`;
  }

  get id(): number {
    return this.options.shardId;
  }

  /** Latest heartbeat round-trip latency in milliseconds. */
  get ping(): number | null {
    return this._ping;
  }

  /** Mapped readyState: 0 idle/closed, 1 connecting, 2 open, 3 closing. */
  get status(): number {
    if (!this.ws) return 0;
    const map: Record<number, number> = { 0: 1, 1: 2, 2: 3 };
    return map[this.ws.readyState] ?? 0;
  }

  connect(): void {
    if (this.phase === Phase.Destroyed || this.phase === Phase.Connecting) return;
    if (this.ws?.readyState === 0 || this.ws?.readyState === 1) return;

    this.clearReconnectTimer();
    this.phase = Phase.Connecting;
    this.resetHeartbeatLatency();
    this.debug('Connecting');

    try {
      this.ws = new this.WS(this.url);
    } catch (err) {
      this.phase = Phase.Idle;
      this.emit('error', asError(err));
      this.scheduleReconnect();
      return;
    }

    if (!this.bindSocket(this.ws)) {
      this.phase = Phase.Idle;
      this.ws = null;
      this.emit('error', new Error('WebSocket implementation missing event API'));
      this.scheduleReconnect();
    }
  }

  send(payload: GatewaySendPayload): void {
    if (this.ws?.readyState !== 1) return;
    this.ws.send(JSON.stringify(payload));
  }

  destroy(): void {
    this.phase = Phase.Destroyed;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.resetHeartbeatLatency();
    this.ws?.close(1000);
    this.ws = null;
    this.sessionId = null;
    this.seq = null;
  }

  /** @internal — exposed for tests */
  handlePayload(payload: GatewayReceivePayload): void {
    switch (payload.op) {
      case GatewayOpcodes.Hello:
        this.handleHello(payload.d);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.lastHeartbeatAck = true;
        if (this.heartbeatSentAt !== null) {
          this._ping = Math.max(0, Math.round(performance.now() - this.heartbeatSentAt));
          this.heartbeatSentAt = null;
        }
        break;
      case GatewayOpcodes.Dispatch:
        this.handleDispatch(payload);
        break;
      case GatewayOpcodes.InvalidSession: {
        const resumable = Boolean(payload.d);
        this.debug(`Invalid session (resumable=${resumable}), reconnecting`);
        if (!resumable) {
          this.sessionId = null;
          this.seq = null;
        }
        this.ws?.close(1000);
        break;
      }
      case GatewayOpcodes.Reconnect:
        this.debug('Reconnect requested');
        this.ws?.close(1000);
        break;
      case GatewayOpcodes.Heartbeat:
        this.sendHeartbeat();
        break;
      case GatewayOpcodes.GatewayError: {
        const detail = formatGatewayErrorDetail(payload.d);
        this.debug(`Gateway error: ${detail}`);
        this.emit('error', new Error(`Gateway error: ${detail}`));
        break;
      }
      default:
        break;
    }
  }

  private bindSocket(ws: WebSocketLike): boolean {
    if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('open', () => this.onOpen());
      ws.addEventListener('message', (e) => this.onMessage(e));
      ws.addEventListener('close', (e) => this.onClose(closeCodeFromEvent(e)));
      ws.addEventListener('error', () => this.onSocketError());
      return true;
    }
    if (typeof ws.on === 'function') {
      ws.on('open', () => this.onOpen());
      ws.on('message', (d) => this.onMessage(d));
      ws.on('close', (code) => this.onClose(typeof code === 'number' ? code : 1006));
      ws.on('error', (err) => this.onSocketError(err));
      return true;
    }
    return false;
  }

  private onOpen(): void {
    if (this.phase === Phase.Destroyed) return;
    this.phase = Phase.Open;
    this.reconnectDelayMs = RECONNECT_INITIAL_MS;
    this.debug('Socket open');
  }

  private onMessage(raw: unknown): void {
    try {
      // One JSON.parse per payload — then narrow from unknown.
      const payload = narrowGatewayPayload(JSON.parse(messageDataToString(raw)) as unknown);
      if (!payload) {
        this.emit('error', new TypeError('Invalid gateway payload'));
        return;
      }
      this.handlePayload(payload);
    } catch (err) {
      this.emit('error', asError(err));
    }
  }

  private onClose(code: number): void {
    if (this.phase === Phase.Destroyed) return;
    this.phase = Phase.Idle;
    this.ws = null;
    this.stopHeartbeat();
    this.resetHeartbeatLatency();
    this.emit('close', code);
    this.debug(`Closed: ${code}`);
    if (shouldReconnectOnClose(code)) this.scheduleReconnect();
  }

  private onSocketError(err?: unknown): void {
    this.emit('error', asError(err));
    if (this.phase === Phase.Destroyed || !this.ws) return;
    this.phase = Phase.Idle;
    try {
      this.ws.close(1000);
    } catch {
      // ignore
    }
    this.ws = null;
    this.stopHeartbeat();
    this.resetHeartbeatLatency();
    this.debug('Connection error; will retry…');
    this.scheduleReconnect();
  }

  private handleDispatch(payload: GatewayReceivePayload): void {
    if (typeof payload.s === 'number') this.seq = payload.s;
    if (payload.t === 'READY') {
      const sessionId = narrowSessionId(payload.d);
      if (sessionId) this.sessionId = sessionId;
      this.reconnectDelayMs = RECONNECT_INITIAL_MS;
      this.emit('ready', payload.d);
    } else if (payload.t === 'RESUMED') {
      this.reconnectDelayMs = RECONNECT_INITIAL_MS;
      this.emit('resumed');
    }
    this.emit('dispatch', payload);
  }

  private handleHello(value: unknown): void {
    const data = narrowHelloData(value);
    if (!data || data.heartbeat_interval <= 0) {
      this.emit('error', new TypeError('Invalid HELLO heartbeat_interval'));
      return;
    }

    const interval = data.heartbeat_interval;
    this.stopHeartbeat();
    this.lastHeartbeatAck = true;
    // Fluxer: jitter in [0, interval), then beat every interval.
    this.heartbeatTimeout = setTimeout(() => {
      this.heartbeatTimeout = null;
      this.sendHeartbeat();
      this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), interval);
    }, Math.random() * interval);

    if (this.sessionId && this.seq !== null) {
      this.send({
        op: GatewayOpcodes.Resume,
        d: {
          token: this.options.token,
          session_id: this.sessionId,
          seq: this.seq,
        } satisfies GatewayResumeData,
      });
      return;
    }

    const identify: GatewayIdentifyData = {
      token: this.options.token,
      intents: this.options.intents ?? 0,
      properties: {
        os: typeof process !== 'undefined' ? (process.platform ?? 'unknown') : 'unknown',
        browser: 'fluxerjs',
        device: 'fluxerjs',
      },
    };
    if (this.options.flags !== undefined) identify.flags = this.options.flags;
    if (this.options.ignoredEvents?.length) identify.ignored_events = this.options.ignoredEvents;
    if (this.options.initialGuildId) identify.initial_guild_id = this.options.initialGuildId;
    if (this.options.presence) identify.presence = this.options.presence;
    if (this.options.numShards > 1) {
      identify.shard = [this.options.shardId, this.options.numShards];
    }
    this.send({ op: GatewayOpcodes.Identify, d: identify });
  }

  private sendHeartbeat(): void {
    if (!this.lastHeartbeatAck && this.seq !== null) {
      this.debug('Heartbeat ack missed; reconnecting');
      this.ws?.close(1000);
      return;
    }
    if (this.ws?.readyState !== 1) return;
    this.lastHeartbeatAck = false;
    this.ws.send(
      JSON.stringify({
        op: GatewayOpcodes.Heartbeat,
        d: this.seq ?? null,
      } satisfies GatewaySendPayload),
    );
    this.heartbeatSentAt ??= performance.now();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimeout !== null) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private resetHeartbeatLatency(): void {
    this.heartbeatSentAt = null;
    this._ping = null;
  }

  private scheduleReconnect(): void {
    if (this.phase === Phase.Destroyed || this.reconnectTimeout !== null) return;
    const delay = Math.min(RECONNECT_MAX_MS, this.reconnectDelayMs * (0.75 + Math.random() * 0.5));
    this.reconnectDelayMs = Math.min(RECONNECT_MAX_MS, this.reconnectDelayMs * 1.5);
    this.debug(`Reconnecting in ${Math.round(delay)}ms…`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout === null) return;
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
  }

  private debug(message: string): void {
    if (this.debugEnabled) this.emit('debug', `[Shard ${this.id}] ${message}`);
  }
}
