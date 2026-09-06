import type { GatewaySendPayload } from '@fluxerjs/types';

/** Runtime status snapshot for a single gateway shard. */
export type ShardStatus = 'idle' | 'connecting' | 'open' | 'closing' | 'destroyed';

/**
 * Pluggable strategy for spawning and connecting gateway shards.
 * @see {@link SimpleShardingStrategy}
 * @see {@link WorkerShardingStrategy}
 */
export interface IShardingStrategy {
  /** Prepare shard workers/handles for the given ids (does not necessarily connect). */
  spawn(shardIds: number[]): Promise<void>;
  /** Connect every spawned shard. */
  connect(): Promise<void>;
  /** Tear down every shard. */
  destroy(options?: { code?: number }): Promise<void>;
  /** Send a gateway payload on a specific shard. */
  send(shardId: number, payload: GatewaySendPayload): Promise<void>;
  /** Snapshot of per-shard connection status. */
  fetchStatus(): Promise<Map<number, ShardStatus>>;
  /**
   * Average heartbeat RTT in milliseconds across shards that have ACKed.
   * Return `-1` when unknown. Custom strategies may omit this.
   */
  getPing?(): number;
}

export type BuildShardingStrategy = (manager: unknown) => IShardingStrategy;
