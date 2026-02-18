import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import type { Guild } from '../structures/Guild.js';
import type { GuildMember } from '../structures/GuildMember.js';

/**
 * Manages guild members with a Collection-like API.
 * Extends Collection so you can use .get(), .set(), .filter(), etc.
 * Provides guild.members.me for Discord.js parity.
 */
export class GuildMemberManager extends Collection<string, GuildMember> {
  constructor(private readonly guild: Guild) {
    super();
  }

  /**
   * The current bot user as a GuildMember in this guild.
   * Returns null if the bot's member is not cached or client.user is null.
   * Use fetchMe() to load the bot's member when not cached.
   *
   * @example
   * const perms = guild.members.me?.permissions;
   * if (perms?.has(PermissionFlags.BanMembers)) { ... }
   */
  get me(): GuildMember | null {
    const userId = this.guild.client.user?.id;
    return userId ? (this.get(userId) ?? null) : null;
  }

  /**
   * Fetch the current bot user as a GuildMember in this guild.
   * Caches the result in guild.members.
   *
   * @throws Error if client.user is null (client not ready)
   * @example
   * const me = await guild.members.fetchMe();
   * console.log(me.displayName);
   */
  async fetchMe(): Promise<GuildMember> {
    const userId = this.guild.client.user?.id;
    if (!userId) {
      throw new Error('Cannot fetch me: client.user is null (client not ready)');
    }
    return this.guild.fetchMember(userId);
  }

  /**
   * Fetch guild members with pagination. GET /guilds/{id}/members.
   * @param options - limit (1-1000), after (user ID for pagination)
   * @returns Array of GuildMember objects (cached in guild.members)
   */
  async fetch(options?: { limit?: number; after?: string }): Promise<GuildMember[]> {
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.after) params.set('after', options.after);
    const qs = params.toString();
    const url = Routes.guildMembers(this.guild.id) + (qs ? `?${qs}` : '');
    const data = await this.guild.client.rest.get<
      | import('@fluxerjs/types').APIGuildMember[]
      | { members?: import('@fluxerjs/types').APIGuildMember[] }
    >(url, { auth: true });
    const list = Array.isArray(data) ? data : (data?.members ?? []);
    const { GuildMember } = await import('../structures/GuildMember.js');
    const members: GuildMember[] = [];
    for (const m of list) {
      const member = new GuildMember(
        this.guild.client,
        { ...m, guild_id: this.guild.id },
        this.guild,
      );
      this.set(member.id, member);
      members.push(member);
    }
    return members;
  }
}
