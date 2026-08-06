import { EventEmitter } from 'node:events';
import type { APIGatewayBotResponse, GatewayPresenceUpdateData } from '@fluxerjs/types';
import { ErrorCodes, FluxerError } from '@fluxerjs/util';
import { getDefaultWebSocket } from './Utils/GetWebSocket.js';
import { type WebSocketConstructor, WebSocketShard } from './WebSocketShard.js';

export type { WebSocketConstructor };

const RETRY_INITIAL_MS = 1000;
const RETRY_MAX_MS = 45_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);
    function finish(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
    signal.addEventListener('abort', finish, { once: true });
  });
}

function isGatewayBotResponse(value: unknown): value is APIGatewayBotResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { url?: unknown }).url === 'string' &&
    typeof (value as { shards?: unknown }).shards === 'number'
  );
}

/** Duck-type REST/HTTP errors that declare themselves non-retryable (e.g. 401/403). */
function isNonRetryableError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isRetryable' in err &&
    (err as { isRetryable: unknown }).isRetryable === false
  );
}

async function retryUntil<T>(
  signal: AbortSignal,
  attempt: () => Promise<T>,
  onError: (error: Error) => void,
): Promise<T | null> {
  let delayMs = RETRY_INITIAL_MS;
  while (!signal.aborted) {
    try {
      const result = await attempt();
      return signal.aborted ? null : result;
    } catch (err) {
      if (signal.aborted) break;
      const error = err instanceof Error ? err : new Error(String(err));
      onError(error);
      // Auth / client errors must fail login — do not spin forever.
      if (isNonRetryableError(err)) throw error;
      await sleep(delayMs, signal);
      delayMs = Math.min(RETRY_MAX_MS, Math.floor(delayMs * 1.5));
    }
  }
  return null;
}

export interface WebSocketManagerOptions {
  token: string;
  /** Legacy intents; Fluxer ignores — send `0`. */
  intents?: number;
  /** Identify `flags` ({@link GatewayIdentifyFlags}). */
  flags?: number;
  /** Identify `ignored_events`. */
  ignoredEvents?: string[];
  /** Identify `initial_guild_id`. */
  initialGuildId?: string;
  rest: { get: (route: string) => Promise<unknown> };
  version?: string;
  presence?: GatewayPresenceUpdateData;
  shardIds?: number[];
  shardCount?: number;
  /** When `false`, shard debug events are not emitted. Default: `true`. */
  debug?: boolean;
  WebSocket?: WebSocketConstructor;
}

export class WebSocketManager extends EventEmitter {
  private readonly options: WebSocketManagerOptions;
  private readonly shards = new Map<number, WebSocketShard>();
  private shardCount = 1;
  private aborted = false;
  private retryAbort: AbortController | null = null;

  constructor(options: WebSocketManagerOptions) {
    super();
    this.options = options;
  }

  async connect(): Promise<void> {
    this.retryAbort?.abort();
    this.destroyShards();
    const retryAbort = new AbortController();
    this.retryAbort = retryAbort;
    this.aborted = false;
    const emitManagerError = (error: Error): void => {
      this.emit('error', { shardId: -1, error });
    };
    const isAborted = (): boolean => this.aborted || retryAbort.signal.aborted;

    let WS = this.options.WebSocket;
    if (!WS) {
      WS =
        (await retryUntil(retryAbort.signal, getDefaultWebSocket, emitManagerError)) ?? undefined;
      if (isAborted()) {
        throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
      }
      if (!WS) {
        throw new FluxerError('Failed to load WebSocket', { code: ErrorCodes.WebSocketLoadFailed });
      }
    }

    const gateway = await retryUntil(
      retryAbort.signal,
      async () => {
        const raw: unknown = await this.options.rest.get('/gateway/bot');
        if (!isGatewayBotResponse(raw)) {
          throw Object.assign(new TypeError('Invalid /gateway/bot response'), {
            isRetryable: false,
          });
        }
        return raw;
      },
      emitManagerError,
    );

    if (isAborted()) {
      throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
    }
    if (!gateway) {
      throw new FluxerError('Failed to fetch gateway', { code: ErrorCodes.GatewayFetchFailed });
    }

    this.shardCount = this.options.shardCount ?? gateway.shards;

    const ids = this.options.shardIds ?? [...Array(this.shardCount).keys()];
    const version = this.options.version ?? '1';

    for (const id of ids) {
      if (isAborted()) break;

      const shard = new WebSocketShard({
        url: gateway.url,
        token: this.options.token,
        intents: this.options.intents ?? 0,
        flags: this.options.flags,
        ignoredEvents: this.options.ignoredEvents,
        initialGuildId: this.options.initialGuildId,
        presence: this.options.presence,
        shardId: id,
        numShards: this.shardCount,
        version,
        debug: this.options.debug,
        WebSocket: WS,
      });

      shard.on('ready', (data) => this.emit('ready', { shardId: id, data }));
      shard.on('resumed', () => this.emit('resumed', id));
      shard.on('dispatch', (payload) => this.emit('dispatch', { shardId: id, payload }));
      shard.on('close', (code) => this.emit('close', { shardId: id, code }));
      shard.on('error', (err) => this.emit('error', { shardId: id, error: err }));
      shard.on('debug', (msg) => this.emit('debug', msg));

      this.shards.set(id, shard);
      try {
        shard.connect();
      } catch (err) {
        this.emit('error', {
          shardId: id,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }
  }

  send(shardId: number, payload: Parameters<WebSocketShard['send']>[0]): void {
    this.shards.get(shardId)?.send(payload);
  }

  destroy(): void {
    this.aborted = true;
    this.retryAbort?.abort();
    this.retryAbort = null;
    this.destroyShards();
  }

  private destroyShards(): void {
    for (const shard of this.shards.values()) shard.destroy();
    this.shards.clear();
  }

  getShardCount(): number {
    return this.shardCount;
  }
}
