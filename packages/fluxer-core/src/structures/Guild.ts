import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type { APIGuild, APIGuildMember } from '@fluxerjs/types';
import { GuildMember } from './GuildMember.js';
import type { GuildChannel } from './Channel.js';
import { CDN_URL } from '../util/Constants.js';
import { Routes } from '@fluxerjs/types';
import type { Webhook } from './Webhook.js';

/** Represents a Fluxer guild (server). */
export class Guild extends Base {
  readonly client: Client;
  readonly id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  readonly ownerId: string;
  members = new Collection<string, GuildMember>();
  channels = new Collection<string, GuildChannel>();

  /** @param data - API guild from GET /guilds/{id} or gateway GUILD_CREATE */
  constructor(client: Client, data: APIGuild) {
    super();
    this.client = client;
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon ?? null;
    this.banner = data.banner ?? null;
    this.ownerId = data.owner_id;
  }

  /** Get the guild icon URL, or null if no icon. */
  iconURL(options?: { size?: number }): string | null {
    if (!this.icon) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/icons/${this.id}/${this.icon}.png${size}`;
  }

  /** Get the guild banner URL, or null if no banner. */
  bannerURL(options?: { size?: number }): string | null {
    if (!this.banner) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/banners/${this.id}/${this.banner}.png${size}`;
  }

  /**
   * Fetch a guild member by user ID.
   * @param userId - The user ID of the member to fetch
   * @returns The guild member, or null if not found
   */
  async fetchMember(userId: string): Promise<GuildMember | null> {
    try {
      const data = await this.client.rest.get<APIGuildMember & { user: { id: string } }>(
        Routes.guildMember(this.id, userId),
      );
      return new GuildMember(this.client, { ...data, guild_id: this.id }, this);
    } catch {
      return null;
    }
  }

  /** Fetch all webhooks in this guild. Returned webhooks do not include the token (cannot send). */
  async fetchWebhooks(): Promise<Webhook[]> {
    const { Webhook } = await import('./Webhook.js');
    const data = await this.client.rest.get(Routes.guildWebhooks(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    return list.map((w) => new Webhook(this.client, w));
  }
}
