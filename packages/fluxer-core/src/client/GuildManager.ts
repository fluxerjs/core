import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import type { Client } from './Client.js';
import type { Guild } from '../structures/Guild.js';

/**
 * Manages guilds with fetch.
 * Extends Collection so you can use .get(), .set(), .filter(), etc.
 */
export class GuildManager extends Collection<string, Guild> {
  constructor(private readonly client: Client) {
    super();
  }

  /**
   * Fetch a guild by ID from the API (or return from cache if present).
   * @param guildId - Snowflake of the guild
   * @returns The guild, or null if not found
   * @example
   * const guild = await client.guilds.fetch(guildId);
   * if (guild) console.log(guild.name);
   */
  async fetch(guildId: string): Promise<Guild | null> {
    const cached = this.get(guildId);
    if (cached) return cached;

    try {
      const { Guild } = await import('../structures/Guild.js');
      const data = await this.client.rest.get<import('@fluxerjs/types').APIGuild>(
        Routes.guild(guildId)
      );
      const guild = new Guild(this.client, data);
      this.set(guild.id, guild);
      return guild;
    } catch {
      return null;
    }
  }
}
