import { randomUUID } from 'node:crypto';
import type { IBroker, IClusterCoordinator, ReshardPlan, ShardLease } from '@fluxerjs/sharding';
import type { RedisClientType } from 'redis';

export interface RedisClusterCoordinatorOptions {
  /** Connected node-redis client (commands). */
  redis: RedisClientType;
  /** Separate connected client for pub/sub (node-redis requirement). */
  subscriber: RedisClientType;
  /** Unique host id. Defaults to a random UUID. */
  hostId?: string;
  /** Key prefix. @default 'fluxer:shard' */
  prefix?: string;
  /** Lease TTL ms. @default 15_000 */
  leaseTtlMs?: number;
  /** Total shards when bootstrapping a new plan. @default 1 */
  initialTotalShards?: number;
  /** How many shards this host wants when claiming. @default all remaining */
  shardsPerHost?: number;
}

const PLAN_CHANNEL_SUFFIX = ':plan';

/**
 * @beta Redis lease + plan coordinator.
 *
 * Keys:
 * - `{prefix}:plan` — JSON {@link ReshardPlan}
 * - `{prefix}:lease:{hostId}` — JSON {@link ShardLease}
 * - `{prefix}:hosts` — SET of active host ids
 */
export class RedisClusterCoordinator implements IClusterCoordinator {
  readonly hostId: string;
  private readonly redis: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly prefix: string;
  private readonly leaseTtlMs: number;
  private readonly shardsPerHost: number | undefined;
  private readonly initialTotalShards: number;
  private readonly planListeners = new Set<(plan: ReshardPlan) => void>();
  private subscribed = false;

  constructor(options: RedisClusterCoordinatorOptions) {
    this.redis = options.redis;
    this.subscriber = options.subscriber;
    this.hostId = options.hostId ?? randomUUID();
    this.prefix = options.prefix ?? 'fluxer:shard';
    this.leaseTtlMs = options.leaseTtlMs ?? 15_000;
    this.shardsPerHost = options.shardsPerHost;
    this.initialTotalShards = options.initialTotalShards ?? 1;
  }

  async claim(preferred?: number[]): Promise<ShardLease> {
    await this.redis.sAdd(`${this.prefix}:hosts`, this.hostId);
    let plan = await this.getPlan();
    if (!plan) {
      plan = await this.publishReshard(this.initialTotalShards);
    }

    const assigned = preferred?.length
      ? preferred.filter((id) => id >= 0 && id < plan.totalShards)
      : this.pickShards(plan);

    const lease: ShardLease = {
      hostId: this.hostId,
      shardIds: assigned,
      generation: plan.generation,
      expiresAt: Date.now() + this.leaseTtlMs,
    };

    await this.redis.set(`${this.prefix}:lease:${this.hostId}`, JSON.stringify(lease), {
      PX: this.leaseTtlMs,
    });

    plan.assignments[this.hostId] = assigned;
    await this.redis.set(`${this.prefix}:plan`, JSON.stringify(plan));
    return lease;
  }

  async heartbeat(): Promise<ShardLease | null> {
    const raw = await this.redis.get(`${this.prefix}:lease:${this.hostId}`);
    if (!raw) return null;
    const lease = JSON.parse(raw) as ShardLease;
    lease.expiresAt = Date.now() + this.leaseTtlMs;
    await this.redis.set(`${this.prefix}:lease:${this.hostId}`, JSON.stringify(lease), {
      PX: this.leaseTtlMs,
    });
    return lease;
  }

  async release(): Promise<void> {
    await this.redis.del(`${this.prefix}:lease:${this.hostId}`);
    await this.redis.sRem(`${this.prefix}:hosts`, this.hostId);
    const plan = await this.getPlan();
    if (plan?.assignments[this.hostId]) {
      delete plan.assignments[this.hostId];
      await this.redis.set(`${this.prefix}:plan`, JSON.stringify(plan));
    }
  }

  async getPlan(): Promise<ReshardPlan | null> {
    const raw = await this.redis.get(`${this.prefix}:plan`);
    if (!raw) return null;
    return JSON.parse(raw) as ReshardPlan;
  }

  async publishReshard(totalShards: number): Promise<ReshardPlan> {
    const prev = await this.getPlan();
    const generation = (prev?.generation ?? 0) + 1;
    const hosts = await this.redis.sMembers(`${this.prefix}:hosts`);
    const hostList = hosts.length > 0 ? hosts : [this.hostId];
    const assignments = assignEvenly(totalShards, hostList);
    const plan: ReshardPlan = { generation, totalShards, assignments };
    await this.redis.set(`${this.prefix}:plan`, JSON.stringify(plan));
    await this.redis.publish(`${this.prefix}${PLAN_CHANNEL_SUFFIX}`, JSON.stringify(plan));
    return plan;
  }

  onPlanChange(listener: (plan: ReshardPlan) => void): () => void {
    this.planListeners.add(listener);
    void this.ensureSubscribed();
    return () => {
      this.planListeners.delete(listener);
    };
  }

  async destroy(): Promise<void> {
    this.planListeners.clear();
    try {
      await this.subscriber.unsubscribe(`${this.prefix}${PLAN_CHANNEL_SUFFIX}`);
    } catch {
      // ignore
    }
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) return;
    this.subscribed = true;
    await this.subscriber.subscribe(`${this.prefix}${PLAN_CHANNEL_SUFFIX}`, (message) => {
      try {
        const plan = JSON.parse(message) as ReshardPlan;
        for (const listener of this.planListeners) listener(plan);
      } catch {
        // ignore malformed
      }
    });
  }

  private pickShards(plan: ReshardPlan): number[] {
    const taken = new Set(Object.values(plan.assignments).flat());
    const available = [...Array(plan.totalShards).keys()].filter((id) => !taken.has(id));
    const n = this.shardsPerHost ?? available.length;
    return available.slice(0, n);
  }
}

function assignEvenly(totalShards: number, hosts: string[]): Record<string, number[]> {
  const assignments: Record<string, number[]> = {};
  for (const host of hosts) assignments[host] = [];
  for (let id = 0; id < totalShards; id++) {
    const host = hosts[id % hosts.length] as string;
    (assignments[host] as number[]).push(id);
  }
  return assignments;
}

export interface RedisBrokerOptions {
  redis: RedisClientType;
  subscriber: RedisClientType;
  prefix?: string;
}

/** @beta Redis pub/sub broker for cross-host broadcastEval. */
export class RedisBroker implements IBroker {
  private readonly redis: RedisClientType;
  private readonly subscriber: RedisClientType;
  private readonly prefix: string;
  private readonly channels = new Map<string, Set<(message: unknown) => void>>();

  constructor(options: RedisBrokerOptions) {
    this.redis = options.redis;
    this.subscriber = options.subscriber;
    this.prefix = options.prefix ?? 'fluxer:broker';
  }

  async publish(channel: string, message: unknown): Promise<void> {
    await this.redis.publish(`${this.prefix}:${channel}`, JSON.stringify(message));
  }

  async subscribe(channel: string, listener: (message: unknown) => void): Promise<() => void> {
    const full = `${this.prefix}:${channel}`;
    let set = this.channels.get(full);
    if (!set) {
      set = new Set();
      this.channels.set(full, set);
      await this.subscriber.subscribe(full, (raw) => {
        let parsed: unknown = raw;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // keep raw string
        }
        for (const fn of this.channels.get(full) ?? []) fn(parsed);
      });
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  async destroy(): Promise<void> {
    for (const channel of this.channels.keys()) {
      try {
        await this.subscriber.unsubscribe(channel);
      } catch {
        // ignore
      }
    }
    this.channels.clear();
  }
}
