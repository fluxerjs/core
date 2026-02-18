import { Collection } from '@fluxerjs/collection';
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
    return userId ? this.get(userId) ?? null : null;
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
}
