import type { Channel } from '../Domain/Channel/index.js';
import type { Guild } from '../Domain/Guild/Guild.js';
import type { GuildMember } from '../Domain/Guild/GuildMember.js';
import type { Message } from '../Domain/Message/index.js';
import type { User } from '../Domain/User.js';
import type { ResolvedCacheLimits } from '../Helpers/Options.js';
import type { Client } from './Client.js';

/** Snapshot of current cache sizes. */
export interface CacheStats {
  guilds: number;
  channels: number;
  users: number;
  members: number;
  messages: number;
  messageChannels: number;
  roles: number;
  emojis: number;
  stickers: number;
}

/**
 * Public cache facade: limits, stats, sweeps, and cascade teardown entry points.
 * Not a second source of truth — wraps managers / {@link MessageCache}.
 */
export class CacheController {
  /** Resolved limits applied at Client construction. */
  readonly limits: ResolvedCacheLimits;

  /** Re-entrancy guard for dual-index / guild cascade teardown. */
  private _cascading = false;

  constructor(
    private readonly client: Client,
    limits: ResolvedCacheLimits,
  ) {
    this.limits = limits;
  }

  /** Whether a cascade teardown is currently in progress. */
  get cascading(): boolean {
    return this._cascading;
  }

  /** Current sizes for each cache bucket. */
  stats(): CacheStats {
    let members = 0;
    let roles = 0;
    let emojis = 0;
    let stickers = 0;
    for (const guild of this.client.guilds.values()) {
      members += guild.members.size;
      roles += guild.roles.size;
      emojis += guild.emojis.size;
      stickers += guild.stickers.size;
    }
    const messageStats = this.client._messageCacheStats();
    return {
      guilds: this.client.guilds.size,
      channels: this.client.channels.size,
      users: this.client.users.size,
      members,
      messages: messageStats.messages,
      messageChannels: messageStats.channels,
      roles,
      emojis,
      stickers,
    };
  }

  /**
   * Sweep cached messages. Filter receives a hydrated {@link Message} (`createdAt`).
   */
  sweepMessages(
    filter?: (message: Message, channelId: string) => boolean,
    channelId?: string,
  ): number {
    return this.client.sweepMessages(filter, channelId);
  }

  sweepMembers(filter?: (member: GuildMember, guildId: string) => boolean): number {
    return this.client.sweepMembers(filter);
  }

  sweepUsers(filter?: (user: User, id: string) => boolean): number {
    return this.client.users.sweep(filter);
  }

  /**
   * Sweep channels from the global index (cascades guild index + message cache).
   * Returns count removed.
   */
  sweepChannels(filter?: (channel: Channel, id: string) => boolean): number {
    let removed = 0;
    for (const [id, channel] of [...this.client.channels.entries()]) {
      if (!filter || filter(channel, id)) {
        if (this.client.channels.delete(id)) removed++;
      }
    }
    return removed;
  }

  /**
   * Sweep guilds (cascades channels + message caches). Returns count removed.
   */
  sweepGuilds(filter?: (guild: Guild, id: string) => boolean): number {
    let removed = 0;
    for (const [id, guild] of [...this.client.guilds.entries()]) {
      if (!filter || filter(guild, id)) {
        if (this.client.guilds.delete(id)) removed++;
      }
    }
    return removed;
  }

  /**
   * Tear down nested caches when a guild leaves `client.guilds`.
   * Removes channels from the global index, clears message caches, and empties guild collections.
   * Does not mass-delete `client.users`.
   * @internal
   */
  cascadeGuild(guild: Guild): void {
    if (this._cascading) return;
    if (!guild || typeof guild !== 'object') return;
    const channels = guild.channels;
    if (!channels || typeof channels.values !== 'function') return;

    this._cascading = true;
    try {
      for (const channel of [...channels.values()]) {
        Map.prototype.delete.call(this.client.channels, channel.id);
        this.client._clearMessageCache(channel.id);
      }
      channels.clear();
      guild.roles?.clear?.();
      guild.emojis?.clear?.();
      guild.stickers?.clear?.();
      guild.members?.clear?.();
    } finally {
      this._cascading = false;
    }
  }

  /**
   * Keep dual channel indexes + message cache aligned when a channel leaves a cache.
   * Uses `Map.prototype.delete` so ChannelManager/Guild channel `delete` overrides do not re-enter.
   * @param channel - Channel being removed
   * @param from - Which index initiated the removal (`global` = client.channels, `guild` = guild.channels)
   * @internal
   */
  cascadeChannel(channel: Channel, from: 'global' | 'guild' | 'both' = 'both'): void {
    const guildId =
      typeof channel.isGuild === 'function' && channel.isGuild() ? channel.guildId : undefined;

    const dropFromGuild = (): void => {
      if (!guildId) return;
      const guildChannels = this.client.guilds.get(guildId)?.channels;
      if (guildChannels) Map.prototype.delete.call(guildChannels, channel.id);
    };

    const dropFromGlobal = (): void => {
      Map.prototype.delete.call(this.client.channels, channel.id);
    };

    const clearMessages = (): void => {
      this.client._clearMessageCache(channel.id);
    };

    if (this._cascading) {
      if (from === 'global' || from === 'both') dropFromGuild();
      if (from === 'guild' || from === 'both') dropFromGlobal();
      clearMessages();
      return;
    }

    this._cascading = true;
    try {
      if (from === 'global' || from === 'both') dropFromGuild();
      if (from === 'guild' || from === 'both') dropFromGlobal();
      clearMessages();
    } finally {
      this._cascading = false;
    }
  }
}
