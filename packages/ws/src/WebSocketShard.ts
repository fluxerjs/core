import { EventEmitter } from 'events';
import {
  GatewaySendPayload,
  GatewayHelloData,
  GatewayReceivePayload,
  GatewayIdentifyData,
  GatewayResumeData,
  GatewayPresenceUpdateData,
} from '@fluxerjs/types';
import { GatewayOpcodes } from '@fluxerjs/types';
import { getDefaultWebSocketSync } from './utils/getWebSocket.js';

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
  intents: number;
  presence?: GatewayPresenceUpdateData;
  shardId: number;
  numShards: number;
  /** Gateway API version (e.g. "1" for Fluxer). Defaults to "1" when not set. */
  version?: string;
  WebSocket?: WebSocketConstructor;
}

export interface WebSocketShardEvents {
  ready: [payload: unknown];
  resumed: [];
  dispatch: [payload: GatewayReceivePayload];
  close: [code: number];
  error: [error: Error];
  debug: [message: string];
}

const RECONNECT_INITIAL_MS = 1000;
const RECONNECT_MAX_MS = 45000;

export class WebSocketShard extends EventEmitter {
  private ws: WebSocketLike | null = null;
  private readonly options: WebSocketShardOptions;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatAt = 0;
  /** True until we send a heartbeat; then false until we get HeartbeatAck. Avoids closing before first heartbeat. */
  private lastHeartbeatAck = true;
  private sessionId: string | null = null;
  private seq: number | null = null;
  private destroying = false;
  private readonly url: string;
  private readonly WS: WebSocketConstructor;
  /** Current reconnect delay in ms; resets on successful connect. */
  private reconnectDelayMs = RECONNECT_INITIAL_MS;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  private scheduleReconnect(): void {
    if (this.destroying) return;
    if (this.reconnectTimeout !== null) return;
    const delay = Math.min(RECONNECT_MAX_MS, this.reconnectDelayMs * (0.75 + Math.random() * 0.5));
    this.reconnectDelayMs = Math.min(RECONNECT_MAX_MS, this.reconnectDelayMs * 1.5);
    this.debug(`Reconnecting in ${Math.round(delay)}ms…`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  constructor(options: WebSocketShardOptions) {
    super();
    this.options = options;
    this.WS = options.WebSocket ?? (getDefaultWebSocketSync() as unknown as WebSocketConstructor);
    const version = options.version ?? '1';
    const params = new URLSearchParams({ v: version, encoding: 'json' });
    this.url = `${options.url}?${params}`;
  }

  get id(): number {
    return this.options.shardId;
  }

  get status(): number {
    if (!this.ws) return 0; // Idle
    switch (this.ws.readyState) {
      case 0:
        return 1; // Connecting
      case 1:
        return 2; // Ready
      case 2:
        return 3; // Closing
      case 3:
        return 0;
      default:
        return 0;
    }
  }

  connect(): void {
    if (this.ws?.readyState === 1) return;
    this.destroying = false;
    this.debug('Connecting');
    const ws = new this.WS(this.url);
    this.ws = ws;

    const handleMessage = (data: string | Buffer) => {
      try {
        const str = typeof data === 'string' ? data : (data as Buffer).toString();
        this.handlePayload(JSON.parse(str) as GatewayReceivePayload);
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    };

    const handleClose = (code: number) => {
      this.ws = null;
      this.stopHeartbeat();
      this.emit('close', code);
      this.debug(`Closed: ${code}`);
      if (!this.destroying && shouldReconnectOnClose(code)) {
        this.scheduleReconnect();
      }
    };

    const handleError = (err?: unknown) => {
      const error = err instanceof Error ? err : new Error('WebSocket error');
      this.emit('error', error);
      if (!this.destroying && this.ws) {
        this.ws = null;
        this.stopHeartbeat();
        this.debug('Connection error; will retry…');
        this.scheduleReconnect();
      }
    };

    const handleOpen = () => {
      this.debug('Socket open');
      this.reconnectDelayMs = RECONNECT_INITIAL_MS;
    };

    if (typeof ws.addEventListener === 'function') {
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('message', (e: unknown) =>
        handleMessage((e as MessageEvent).data as string),
      );
      ws.addEventListener('close', (e: unknown) => handleClose((e as CloseEvent).code));
      ws.addEventListener('error', () => handleError(new Error('WebSocket error')));
    } else if (typeof ws.on === 'function') {
      ws.on('open', handleOpen);
      ws.on('message', (d: unknown) => handleMessage(d as Buffer | string));
      ws.on('close', (code?: unknown) => handleClose((code as number) ?? 1006));
      ws.on('error', (err?: unknown) => handleError(err));
    }
  }

  private debug(message: string): void {
    this.emit('debug', `[Shard ${this.id}] ${message}`);
  }

  private handlePayload(payload: GatewayReceivePayload): void {
    switch (payload.op) {
      case GatewayOpcodes.Hello:
        this.handleHello(payload.d as GatewayHelloData);
        break;
      case GatewayOpcodes.HeartbeatAck:
        this.lastHeartbeatAck = true;
        break;
      case GatewayOpcodes.Dispatch:
        if (payload.t === 'READY') {
          const d = payload.d as { session_id: string };
          this.sessionId = d.session_id;
          this.reconnectDelayMs = RECONNECT_INITIAL_MS;
          this.emit('ready', payload.d);
        } else if (payload.t === 'RESUMED') {
          this.reconnectDelayMs = RECONNECT_INITIAL_MS;
          this.emit('resumed');
        }
        if (payload.s !== undefined) this.seq = payload.s;
        this.emit('dispatch', payload);
        break;
      case GatewayOpcodes.InvalidSession:
        this.debug(`Invalid session (d=${payload.d}), reconnecting`);
        this.sessionId = null;
        this.seq = null;
        setTimeout(() => this.connect(), 1000 + Math.random() * 4000);
        break;
      case GatewayOpcodes.Reconnect:
        this.debug('Reconnect requested');
        this.ws?.close(1000);
        setTimeout(() => this.connect(), 100);
        break;
      default:
        break;
    }
  }

  private handleHello(data: GatewayHelloData): void {
    const jitter = Math.random() * data.heartbeat_interval;
    this.heartbeatAt = Date.now() + jitter;
    this.startHeartbeat(data.heartbeat_interval);

    if (this.sessionId && this.seq !== null) {
      this.send({
        op: GatewayOpcodes.Resume,
        d: {
          token: this.options.token,
          session_id: this.sessionId,
          seq: this.seq,
        } as GatewayResumeData,
      });
    } else {
      const identify: GatewayIdentifyData = {
        token: this.options.token,
        intents: this.options.intents,
        properties: {
          os: process.platform ?? 'unknown',
          browser: 'fluxerjs',
          device: 'fluxerjs',
        },
      };
      if (this.options.presence) identify.presence = this.options.presence;
      this.send({ op: GatewayOpcodes.Identify, d: identify });
    }
  }

  private startHeartbeat(interval: number): void {
    this.stopHeartbeat();
    this.lastHeartbeatAck = true; // no heartbeat sent yet → don't treat as missed ack
    this.heartbeatInterval = setInterval(() => {
      if (!this.lastHeartbeatAck && this.seq !== null) {
        this.debug('Heartbeat ack missed; reconnecting');
        this.ws?.close(1000);
        if (!this.destroying) this.scheduleReconnect();
        return;
      }
      this.lastHeartbeatAck = false;
      this.send({ op: GatewayOpcodes.Heartbeat, d: this.seq ?? null });
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(payload: GatewaySendPayload): void {
    if (this.ws?.readyState !== 1) return;
    this.ws.send(JSON.stringify(payload));
  }

  destroy(): void {
    this.destroying = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    this.ws?.close(1000);
    this.ws = null;
    this.sessionId = null;
    this.seq = null;
  }
}

/** Close codes after which we should reconnect (normal closure, server ask, or transient/network issues). */
function shouldReconnectOnClose(code: number): boolean {
  switch (code) {
    case 1000: // Normal Closure (server may close with this to ask for reconnect)
    case 1001: // Going Away
    case 1011: // Internal Error (server hit unexpected condition; often transient)
    case 1005: // No Status Received
    case 1006: // Abnormal Closure (network drop, server crash)
    case 1012: // Service Restart
    case 1013: // Try Again Later
    case 1014: // Bad Gateway
    case 1015: // TLS Handshake Failed
      return true;
    case 4000: // Unknown error
    case 4007: // Invalid seq
    case 4009: // Session timeout
    case 4010: // Invalid shard
    case 4011: // Sharding required
    case 4012: // Invalid API version (after fix, reconnect is safe)
      return true;
    default:
      return false;
  }
}
