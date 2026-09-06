import type { GatewayPresenceUpdateData, GatewaySendPayload } from '@fluxerjs/types';
import type { IIdentifyThrottler } from '../IdentifyThrottler.js';
import type { ISessionStore } from '../SessionStore.js';
import { averageShardPings, type WebSocketConstructor, WebSocketShard } from '../WebSocketShard.js';
import type { IShardingStrategy, ShardStatus } from './IShardingStrategy.js';

export interface SimpleShardingStrategyContext {
  token: string;
  url: string;
  numShards: number;
  version: string;
  intents: number;
  flags?: number;
  ignoredEvents?: string[];
  initialGuildId?: string;
  presence?: GatewayPresenceUpdateData;
  debug: boolean;
  WebSocket: WebSocketConstructor;
  sessionStore?: ISessionStore;
  identifyThrottler?: IIdentifyThrottler;
  onReady: (shardId: number, data: unknown) => void;
  onResumed: (shardId: number) => void;
  onDispatch: (shardId: number, payload: unknown) => void;
  onClose: (shardId: number, code: number) => void;
  onError: (shardId: number, error: Error) => void;
  onDebug: (message: string) => void;
  onShardingRequired: (shardId: number, numShards: number) => void;
}

/**
 * Default in-process strategy — one {@link WebSocketShard} per id in the current process.
 */
export class SimpleShardingStrategy implements IShardingStrategy {
  private readonly shards = new Map<number, WebSocketShard>();
  private readonly ctx: SimpleShardingStrategyContext;

  constructor(ctx: SimpleShardingStrategyContext) {
    this.ctx = ctx;
  }

  async spawn(shardIds: number[]): Promise<void> {
    for (const id of shardIds) {
      if (this.shards.has(id)) continue;
      const shard = new WebSocketShard({
        url: this.ctx.url,
        token: this.ctx.token,
        intents: this.ctx.intents,
        flags: this.ctx.flags,
        ignoredEvents: this.ctx.ignoredEvents,
        initialGuildId: this.ctx.initialGuildId,
        presence: this.ctx.presence,
        shardId: id,
        numShards: this.ctx.numShards,
        version: this.ctx.version,
        debug: this.ctx.debug,
        WebSocket: this.ctx.WebSocket,
        sessionStore: this.ctx.sessionStore,
      });

      shard.on('ready', (data) => this.ctx.onReady(id, data));
      shard.on('resumed', () => this.ctx.onResumed(id));
      shard.on('dispatch', (payload) => this.ctx.onDispatch(id, payload));
      shard.on('close', (code) => this.ctx.onClose(id, code));
      shard.on('error', (err) =>
        this.ctx.onError(id, err instanceof Error ? err : new Error(String(err))),
      );
      shard.on('debug', (msg) => this.ctx.onDebug(msg));
      shard.on('shardingRequired', ({ shardId, numShards }) =>
        this.ctx.onShardingRequired(shardId, numShards),
      );

      this.shards.set(id, shard);
    }
  }

  async connect(): Promise<void> {
    const throttler = this.ctx.identifyThrottler;
    for (const [id, shard] of this.shards) {
      if (throttler) {
        await throttler.waitForIdentify(id, async () => {
          shard.connect();
        });
      } else {
        shard.connect();
      }
    }
  }

  async destroy(_options?: { code?: number }): Promise<void> {
    for (const shard of this.shards.values()) shard.destroy();
    this.shards.clear();
  }

  async send(shardId: number, payload: GatewaySendPayload): Promise<void> {
    this.shards.get(shardId)?.send(payload);
  }

  async fetchStatus(): Promise<Map<number, ShardStatus>> {
    const out = new Map<number, ShardStatus>();
    for (const [id, shard] of this.shards) {
      const status = shard.status;
      out.set(
        id,
        status === 0
          ? 'idle'
          : status === 1
            ? 'connecting'
            : status === 2
              ? 'open'
              : status === 3
                ? 'closing'
                : 'idle',
      );
    }
    return out;
  }

  /** @internal Access for managers that need raw shard handles. */
  getShard(shardId: number): WebSocketShard | undefined {
    return this.shards.get(shardId);
  }

  /** @internal */
  getShards(): ReadonlyMap<number, WebSocketShard> {
    return this.shards;
  }

  getPing(): number {
    return averageShardPings([...this.shards.values()].map((shard) => shard.ping));
  }
}
