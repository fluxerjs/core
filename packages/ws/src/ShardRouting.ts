/**
 * Fluxer gateway shard routing primitives.
 * Guild assignment matches the server: `(guild_id >> 22) % num_shards`.
 * @see fluxer_gateway `gateway_sharding.erl`
 */

/** Hard cap on `num_shards` accepted by the gateway. */
export const MAX_SHARD_COUNT = 16_384;

/** Max guilds a single bot shard may retain; exceeding closes with 4011. */
export const MAX_GUILDS_PER_SHARD = 2_500;

/**
 * Recommended guilds per shard for auto-sharding headroom under {@link MAX_GUILDS_PER_SHARD}.
 * @default 1500
 */
export const DEFAULT_GUILDS_PER_SHARD = 1_500;

/**
 * Compute which shard owns a guild for a given total shard count.
 * @throws {RangeError} when `numShards` is not a positive integer ≤ {@link MAX_SHARD_COUNT}
 */
export function shardIdForGuild(guildId: string, numShards: number): number {
  if (!Number.isInteger(numShards) || numShards < 1 || numShards > MAX_SHARD_COUNT) {
    throw new RangeError(
      `numShards must be an integer in [1, ${MAX_SHARD_COUNT}], got ${String(numShards)}`,
    );
  }
  return Number((BigInt(guildId) >> 22n) % BigInt(numShards));
}

/**
 * Recommended shard count from a guild total.
 * Uses {@link DEFAULT_GUILDS_PER_SHARD} unless overridden, capped at {@link MAX_SHARD_COUNT}.
 */
export function recommendedShardCount(
  guildCount: number,
  guildsPerShard: number = DEFAULT_GUILDS_PER_SHARD,
): number {
  if (!Number.isFinite(guildCount) || guildCount <= 0) return 1;
  if (!Number.isFinite(guildsPerShard) || guildsPerShard <= 0) {
    throw new RangeError(`guildsPerShard must be a positive number, got ${String(guildsPerShard)}`);
  }
  return Math.min(MAX_SHARD_COUNT, Math.max(1, Math.ceil(guildCount / guildsPerShard)));
}

/**
 * Whether a guild belongs on the given shard.
 * Unsharded / `[0, 1]` sessions receive every guild.
 */
export function guildMatchesShard(
  guildId: string,
  shard: { shardId: number; numShards: number } | null | undefined,
): boolean {
  if (!shard || (shard.shardId === 0 && shard.numShards === 1)) return true;
  return shardIdForGuild(guildId, shard.numShards) === shard.shardId;
}
