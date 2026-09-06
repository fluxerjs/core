/**
 * Multi-machine cluster coordinator + broker interfaces (Layer 3).
 * Implementations live in `@fluxerjs/sharding-redis`.
 */

/** A contiguous or sparse set of shard ids leased to one host. */
export interface ShardLease {
  hostId: string;
  shardIds: number[];
  /** Monotonic generation — bumps on reshard. */
  generation: number;
  /** Lease expiry (epoch ms). */
  expiresAt: number;
}

export interface ReshardPlan {
  generation: number;
  totalShards: number;
  /** Host id → shard ids. */
  assignments: Record<string, number[]>;
}

/**
 * Claims shard ranges across hosts, heartbeats leases, publishes reshard generations.
 */
export interface IClusterCoordinator {
  /** Unique id for this host process. */
  readonly hostId: string;
  /** Claim or renew a lease for the preferred shard range. */
  claim(preferred?: number[]): Promise<ShardLease>;
  /** Heartbeat to keep the lease alive. */
  heartbeat(): Promise<ShardLease | null>;
  /** Release all shards owned by this host. */
  release(): Promise<void>;
  /** Observe the current global shard generation / plan. */
  getPlan(): Promise<ReshardPlan | null>;
  /**
   * Publish a new shard-count generation (e.g. after 4011 / guild growth).
   * Hosts should drain and respawn against the new plan.
   */
  publishReshard(totalShards: number): Promise<ReshardPlan>;
  /** Subscribe to plan changes. Returns an unsubscribe function. */
  onPlanChange(listener: (plan: ReshardPlan) => void): () => void;
  destroy(): Promise<void>;
}

/**
 * Cross-host pub/sub so `broadcastEval` fans out beyond local children.
 */
export interface IBroker {
  publish(channel: string, message: unknown): Promise<void>;
  subscribe(channel: string, listener: (message: unknown) => void): Promise<() => void>;
  destroy(): Promise<void>;
}

export interface ClusterManagerOptions {
  coordinator: IClusterCoordinator;
  broker?: IBroker;
  /** Shards this host prefers when claiming (optional). */
  preferredShards?: number[];
  /** Heartbeat interval ms. @default 5_000 */
  heartbeatIntervalMs?: number;
}

/**
 * @beta Thin multi-host supervisor that claims a shard lease then delegates to
 * a local {@link ShardingManager}-compatible spawn callback.
 */
export class ClusterManager {
  private readonly options: ClusterManagerOptions;
  private lease: ShardLease | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private unsubPlan: (() => void) | null = null;
  private running = false;

  constructor(options: ClusterManagerOptions) {
    this.options = options;
  }

  get currentLease(): ShardLease | null {
    return this.lease;
  }

  /**
   * Claim shards and start heartbeating.
   * `spawnLocal` receives the leased shard ids and total shard count from the plan.
   */
  async start(
    spawnLocal: (lease: ShardLease, plan: ReshardPlan) => Promise<void>,
  ): Promise<ShardLease> {
    if (this.running) throw new Error('ClusterManager already started');
    this.running = true;

    this.lease = await this.options.coordinator.claim(this.options.preferredShards);
    let plan = await this.options.coordinator.getPlan();
    if (!plan) {
      plan = {
        generation: this.lease.generation,
        totalShards: Math.max(...this.lease.shardIds, 0) + 1,
        assignments: { [this.lease.hostId]: this.lease.shardIds },
      };
    }

    await spawnLocal(this.lease, plan);

    const interval = this.options.heartbeatIntervalMs ?? 5_000;
    this.heartbeatTimer = setInterval(() => {
      void this.options.coordinator.heartbeat().then((lease) => {
        if (lease) this.lease = lease;
      });
    }, interval);
    this.heartbeatTimer.unref?.();

    this.unsubPlan = this.options.coordinator.onPlanChange((next) => {
      // Consumers listen via events if they attach; expose via callback re-spawn later.
      void next;
    });

    return this.lease;
  }

  async requestReshard(totalShards: number): Promise<ReshardPlan> {
    return this.options.coordinator.publishReshard(totalShards);
  }

  async destroy(): Promise<void> {
    this.running = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.unsubPlan?.();
    this.unsubPlan = null;
    await this.options.coordinator.release();
    await this.options.coordinator.destroy();
    await this.options.broker?.destroy();
    this.lease = null;
  }
}
