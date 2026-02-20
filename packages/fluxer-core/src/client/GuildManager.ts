import { Collection } from '@fluxerjs/collection';
import { APIGuild, Routes } from '@fluxerjs/types';
import { Client } from './Client.js';
import { Guild } from '../structures/Guild.js';

/**
 * Manages guilds with fetch.
 * Extends Collection so you can use .get(), .set(), .filter(), etc.
 */
export class GuildManager extends Collection<string, Guild> {
  private readonly maxSize: number;

  constructor(private readonly client: Client) {
    super();
    this.maxSize = client.options?.cache?.guilds ?? 0;
  }

  override set(key: string, value: Guild): this {
    if (this.maxSize > 0 && this.size >= this.maxSize && !this.has(key)) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) this.delete(firstKey);
    }
    return super.set(key, value);
  }

  /**
   * Get a guild from cache or fetch from the API if not present.
   * Convenience helper to avoid repeating `client.guilds.get(id) ?? (await client.guilds.fetch(id))`.
   * @param guildId - Snowflake of the guild
   * @returns The guild, or null if not found
   * @example
   * const guild = await client.guilds.resolve(message.guildId);
   * if (guild) console.log(guild.name);
   */
  async resolve(guildId: string): Promise<Guild | null> {
    return this.get(guildId) ?? this.fetch(guildId);
  }

  /**
   * Create a guild. POST /guilds.
   * @param options - name (required), icon (base64), empty_features
   * @returns The created guild
   */
  async create(options: {
    name: string;
    icon?: string | null;
    empty_features?: boolean;
  }): Promise<Guild> {
    const data = await this.client.rest.post<APIGuild>(Routes.guilds(), {
      body: options,
      auth: true,
    });
    const guild = new Guild(this.client, data);
    this.set(guild.id, guild);
    return guild;
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
      const data = await this.client.rest.get<APIGuild>(
        Routes.guild(guildId),
      );
      const guild = new Guild(this.client, data);
      this.set(guild.id, guild);
      return guild;
    } catch {
      return null;
    }
  }
}
