import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUILDS_PER_SHARD,
  guildMatchesShard,
  MAX_GUILDS_PER_SHARD,
  MAX_SHARD_COUNT,
  recommendedShardCount,
  shardIdForGuild,
} from './ShardRouting.js';

describe('ShardRouting', () => {
  it('exports gateway hard caps', () => {
    expect(MAX_SHARD_COUNT).toBe(16_384);
    expect(MAX_GUILDS_PER_SHARD).toBe(2_500);
    expect(DEFAULT_GUILDS_PER_SHARD).toBe(1_500);
  });

  it('computes shard id via (guild_id >> 22) % num_shards', () => {
    // guild_id = (offset * numShards + shardId) << 22 + 1
    const guildFor = (shardId: number, numShards: number, offset = 0): string =>
      String(((BigInt(offset) * BigInt(numShards) + BigInt(shardId)) << 22n) + 1n);

    expect(shardIdForGuild(guildFor(0, 4), 4)).toBe(0);
    expect(shardIdForGuild(guildFor(1, 4), 4)).toBe(1);
    expect(shardIdForGuild(guildFor(3, 4), 4)).toBe(3);
    expect(shardIdForGuild(guildFor(2, 8, 5), 8)).toBe(2);
  });

  it('rejects invalid numShards', () => {
    expect(() => shardIdForGuild('1', 0)).toThrow(RangeError);
    expect(() => shardIdForGuild('1', MAX_SHARD_COUNT + 1)).toThrow(RangeError);
  });

  it('recommends shard count with headroom', () => {
    expect(recommendedShardCount(0)).toBe(1);
    expect(recommendedShardCount(1500)).toBe(1);
    expect(recommendedShardCount(1501)).toBe(2);
    expect(recommendedShardCount(1_000_000)).toBe(667);
  });

  it('guildMatchesShard treats unsharded and [0,1] as all guilds', () => {
    expect(guildMatchesShard('1', null)).toBe(true);
    expect(guildMatchesShard('1', { shardId: 0, numShards: 1 })).toBe(true);
  });
});
