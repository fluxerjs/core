import { EventEmitter } from 'node:events';
import type {
  APIGatewayBotResponse,
  GatewayPresenceUpdateData,
  GatewaySendPayload,
} from '@fluxerjs/types';
import { ErrorCodes, FluxerError } from '@fluxerjs/util';
import type { IIdentifyThrottler } from './IdentifyThrottler.js';
import { SimpleIdentifyThrottler } from './IdentifyThrottler.js';
import type { ISessionStore } from './SessionStore.js';
import { MemorySessionStore } from './SessionStore.js';
import {
  DEFAULT_GUILDS_PER_SHARD,
  MAX_SHARD_COUNT,
  recommendedShardCount,
} from './ShardRouting.js';
import type { IShardingStrategy, ShardStatus } from './Strategies/IShardingStrategy.js';
import { SimpleShardingStrategy } from './Strategies/SimpleShardingStrategy.js';
import { getDefaultWebSocket } from './Utils/GetWebSocket.js';
import type { WebSocketConstructor, WebSocketShard } from './WebSocketShard.js';

export type { WebSocketConstructor };

const RETRY_INITIAL_MS = 1000;
const RETRY_MAX_MS = 45_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  isAborted: () => boolean,
  attempt: () => Promise<T>,
  onError: (error: Error) => void,
): Promise<T | null> {
  let delayMs = RETRY_INITIAL_MS;
  while (!isAborted()) {
    try {
      return await attempt();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError(error);
      if (isNonRetryableError(err)) throw error;
      await sleep(delayMs);
      delayMs = Math.min(RETRY_MAX_MS, Math.floor(delayMs * 1.5));
    }
  }
  return null;
}

export interface WebSocketManagerRest {
  get: (route: string) => Promise<unknown>;
}

export type BuildShardingStrategyFn = (manager: WebSocketManager) => IShardingStrategy;

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
  rest: WebSocketManagerRest;
  version?: string;
  presence?: GatewayPresenceUpdateData;
  /**
   * Explicit shard ids to connect. Defaults to `0..shardCount-1`.
   */
  shardIds?: number[];
  /**
   * Total shard count, or `'auto'` to derive from guild count.
   * Fluxer's `/gateway/bot` currently always reports `shards: 1`, so `'auto'`
   * counts guilds via `/users/@me/guilds` when possible.
   */
  shardCount?: number | 'auto';
  /**
   * Guilds per shard when `shardCount: 'auto'`.
   * @default 1500
   */
  guildsPerShard?: number;
  /** When `false`, shard debug events are not emitted. Default: `true`. */
  debug?: boolean;
  WebSocket?: WebSocketConstructor;
  /** Persist sessions for RESUME across restarts. Defaults to an in-memory store. */
  sessionStore?: ISessionStore;
  /** Throttle IDENTIFY against Fluxer's per-IP limits. */
  identifyThrottler?: IIdentifyThrottler;
  /**
   * Build a custom sharding strategy. Defaults to {@link SimpleShardingStrategy}.
   * Prefer {@link WorkerShardingStrategy} for CPU isolation of gateway parsing.
   */
  buildStrategy?: BuildShardingStrategyFn;
}

export class WebSocketManager extends EventEmitter {
  private readonly options: WebSocketManagerOptions;
  private strategy: IShardingStrategy | null = null;
  private simpleStrategy: SimpleShardingStrategy | null = null;
  private shardCount = 1;
  private aborted = false;
  private readonly sessionStore: ISessionStore;
  private readonly identifyThrottler: IIdentifyThrottler;
  private gatewayUrl = '';

  constructor(options: WebSocketManagerOptions) {
    super();
    this.options = options;
    this.sessionStore = options.sessionStore ?? new MemorySessionStore();
    this.identifyThrottler = options.identifyThrottler ?? new SimpleIdentifyThrottler();
  }

  async connect(): Promise<void> {
    this.aborted = false;
    const emitManagerError = (error: Error): void => {
      this.emit('error', { shardId: -1, error });
    };
    const isAborted = (): boolean => this.aborted;

    let WS = this.options.WebSocket;
    if (!WS) {
      WS = (await retryUntil(isAborted, getDefaultWebSocket, emitManagerError)) ?? undefined;
      if (this.aborted) {
        throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
      }
      if (!WS) {
        throw new FluxerError('Failed to load WebSocket', { code: ErrorCodes.WebSocketLoadFailed });
      }
    }

    const gateway = await retryUntil(
      isAborted,
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

    if (this.aborted) {
      throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
    }
    if (!gateway) {
      throw new FluxerError('Failed to fetch gateway', { code: ErrorCodes.GatewayFetchFailed });
    }

    this.gatewayUrl = gateway.url;
    this.shardCount = await this.resolveShardCount(gateway.shards);
    if (this.shardCount > MAX_SHARD_COUNT) {
      throw new FluxerError(`shardCount exceeds max ${MAX_SHARD_COUNT}`, {
        code: ErrorCodes.GatewayFetchFailed,
      });
    }

    const ids = this.options.shardIds ?? [...Array(this.shardCount).keys()];
    const version = this.options.version ?? '1';

    const strategyCallbacks = {
      onReady: (shardId: number, data: unknown) => this.emit('ready', { shardId, data }),
      onResumed: (shardId: number) => this.emit('resumed', shardId),
      onDispatch: (shardId: number, payload: unknown) =>
        this.emit('dispatch', { shardId, payload }),
      onClose: (shardId: number, code: number) => this.emit('close', { shardId, code }),
      onError: (shardId: number, error: Error) => this.emit('error', { shardId, error }),
      onDebug: (msg: string) => this.emit('debug', msg),
      onShardingRequired: (shardId: number, numShards: number) =>
        this.emit('shardingRequired', { shardId, numShards }),
    };

    if (this.options.buildStrategy) {
      this.strategy = this.options.buildStrategy(this);
      this.simpleStrategy = null;
    } else {
      this.simpleStrategy = new SimpleShardingStrategy({
        token: this.options.token,
        url: gateway.url,
        numShards: this.shardCount,
        version,
        intents: this.options.intents ?? 0,
        flags: this.options.flags,
        ignoredEvents: this.options.ignoredEvents,
        initialGuildId: this.options.initialGuildId,
        presence: this.options.presence,
        debug: this.options.debug !== false,
        WebSocket: WS,
        sessionStore: this.sessionStore,
        identifyThrottler: this.identifyThrottler,
        ...strategyCallbacks,
      });
      this.strategy = this.simpleStrategy;
    }

    // If a custom strategy was provided without knowing gateway URL yet, prefer Simple when
    // buildStrategy returned something that still needs spawn — always spawn/connect via strategy.
    await this.strategy.spawn(ids);
    if (this.aborted) {
      await this.strategy.destroy();
      throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
    }
    await this.strategy.connect();
  }

  /**
   * Context helpers for custom {@link IShardingStrategy} builders.
   * Available after `/gateway/bot` resolves inside {@link connect}.
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  getSessionStore(): ISessionStore {
    return this.sessionStore;
  }

  getIdentifyThrottler(): IIdentifyThrottler {
    return this.identifyThrottler;
  }

  getOptions(): Readonly<WebSocketManagerOptions> {
    return this.options;
  }

  send(shardId: number, payload: GatewaySendPayload): void {
    void this.strategy?.send(shardId, payload);
  }

  destroy(): void {
    this.aborted = true;
    this.identifyThrottler.destroy?.();
    void this.strategy?.destroy();
    this.strategy = null;
    this.simpleStrategy = null;
  }

  getShardCount(): number {
    return this.shardCount;
  }

  /** Per-shard status map (empty before connect). */
  async fetchStatus(): Promise<Map<number, ShardStatus>> {
    return (await this.strategy?.fetchStatus()) ?? new Map();
  }

  /**
   * Raw in-process shard handles when using {@link SimpleShardingStrategy}.
   * Empty / undefined for worker strategies.
   */
  getShards(): ReadonlyMap<number, WebSocketShard> {
    return this.simpleStrategy?.getShards() ?? new Map();
  }

  getShard(shardId: number): WebSocketShard | undefined {
    return this.simpleStrategy?.getShard(shardId);
  }

  /**
   * Last gateway heartbeat ACK latency (RTT) in milliseconds (average across shards).
   * `-1` until the first ACK, or when no strategy is connected.
   * Per-shard: `manager.getShard(id)?.ping`.
   * @example
   * client.on(Events.Ready, () => {
   *   console.log(client.ws.ping);
   * });
   */
  get ping(): number {
    return this.strategy?.getPing?.() ?? -1;
  }

  private async resolveShardCount(gatewayShards: number): Promise<number> {
    const configured = this.options.shardCount;
    if (typeof configured === 'number') {
      if (!Number.isInteger(configured) || configured < 1) {
        throw new FluxerError('shardCount must be a positive integer', {
          code: ErrorCodes.GatewayFetchFailed,
        });
      }
      return configured;
    }
    if (configured !== 'auto') {
      return Math.max(1, gatewayShards || 1);
    }

    const guildsPerShard = this.options.guildsPerShard ?? DEFAULT_GUILDS_PER_SHARD;
    let guildCount = 0;
    try {
      guildCount = await this.countBotGuilds();
    } catch (err) {
      this.emit('debug', `[WebSocketManager] auto shardCount guild fetch failed: ${String(err)}`);
    }
    const recommended = recommendedShardCount(guildCount, guildsPerShard);
    // Prefer the larger of gateway hint and computed — gateway is often stubbed at 1.
    return Math.max(gatewayShards || 1, recommended);
  }

  private async countBotGuilds(): Promise<number> {
    // Prefer a count-friendly path: paginate /users/@me/guilds.
    let total = 0;
    let after: string | undefined;
    for (;;) {
      const query = after ? `?limit=200&after=${encodeURIComponent(after)}` : '?limit=200';
      const raw: unknown = await this.options.rest.get(`/users/@me/guilds${query}`);
      if (!Array.isArray(raw) || raw.length === 0) break;
      total += raw.length;
      const last = raw[raw.length - 1] as { id?: unknown };
      if (typeof last?.id !== 'string' || raw.length < 200) break;
      after = last.id;
      if (total > MAX_SHARD_COUNT * DEFAULT_GUILDS_PER_SHARD) break;
    }
    return total;
  }
}
