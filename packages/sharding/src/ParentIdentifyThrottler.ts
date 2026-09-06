import type { IIdentifyThrottler } from '@fluxerjs/ws';
import type { ShardClientUtil } from './ShardClientUtil.js';

/**
 * Identify throttler for ShardingManager children.
 * Each IDENTIFY waits for a spawn token from the parent (which owns the per-IP budget).
 */
export class ParentIdentifyThrottler implements IIdentifyThrottler {
  constructor(private readonly shardUtil: ShardClientUtil) {}

  async waitForIdentify<T>(shardId: number, fn: () => Promise<T>): Promise<T> {
    await this.shardUtil.requestSpawnToken(shardId);
    return fn();
  }
}
