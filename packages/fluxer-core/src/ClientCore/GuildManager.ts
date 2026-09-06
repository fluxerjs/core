import { LimitedCollection } from '@fluxerjs/collection';
import { type APIGuild, Routes } from '@fluxerjs/types';
import { Guild } from '../Domain/Guild/Guild.js';
import { rethrowMapped } from '../Helpers/HttpErrors.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import type { Client } from './Client.js';

/**
 * Guild cache and manager with fetch.
 * Extends {@link LimitedCollection} so you can use `.get()`, `.set()`, `.filter()`, etc.
 * FIFO-evicts (and cascades nested caches) when at the resolved `cache.guilds` limit.
 */
export class GuildManager extends LimitedCollection<string, Guild> {
  constructor(private readonly client: Client) {
    super({
      maxSize: client.cache.limits.guilds,
      onEvict: (_id, guild) => client.cache.cascadeGuild(guild),
    });
  }

  /**
   * Remove a guild from cache and cascade its channels / message caches.
   * Does not leave the guild. Use {@link ClientUser.leaveGuild} for that.
   */
  override delete(key: string): boolean {
    const guild = this.get(key);
    const deleted = super.delete(key);
    if (deleted && guild && !this.client.cache.cascading) {
      this.client.cache.cascadeGuild(guild);
    }
    return deleted;
  }

  /**
   * Get a guild from cache or fetch from the API if not present.
   * @param guildId - Snowflake of the guild
   * @returns The guild
   * @throws FluxerError with GUILD_NOT_FOUND if missing
   */
  async resolve(guildId: string): Promise<Guild> {
    return this.get(guildId) ?? this.fetch(guildId);
  }

  /**
   * Fetch a guild by ID.
   * Returns the cached guild unless `force` is set, in which case REST metadata is applied via `_patch`.
   * @throws FluxerError with GUILD_NOT_FOUND if missing
   */
  async fetch(guildId: string, options?: { force?: boolean }): Promise<Guild> {
    const cached = this.get(guildId);
    if (cached && !options?.force) return cached;

    try {
      const data = await this.client.rest.get<APIGuild>(Routes.guild(guildId));
      if (cached) {
        cached._patch(data);
        return cached;
      }
      const guild = new Guild(this.client, data);
      this.set(guild.id, guild);
      return guild;
    } catch (err) {
      rethrowMapped(err, {
        notFound: { code: ErrorCodes.GuildNotFound, message: `Guild ${guildId} not found` },
        fallback: `Failed to fetch guild ${guildId}`,
      });
    }
  }
}
