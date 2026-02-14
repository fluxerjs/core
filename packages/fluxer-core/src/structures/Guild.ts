import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type { APIGuild } from '@fluxerjs/types';
import type { GuildMember } from './GuildMember.js';
import type { GuildChannel } from './Channel.js';
import { CDN_URL } from '../util/Constants.js';

export class Guild extends Base {
  readonly client: Client;
  readonly id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  readonly ownerId: string;
  members = new Collection<string, GuildMember>();
  channels = new Collection<string, GuildChannel>();

  constructor(client: Client, data: APIGuild) {
    super();
    this.client = client;
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon ?? null;
    this.banner = data.banner ?? null;
    this.ownerId = data.owner_id;
  }

  iconURL(options?: { size?: number }): string | null {
    if (!this.icon) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/icons/${this.id}/${this.icon}.png${size}`;
  }

  bannerURL(options?: { size?: number }): string | null {
    if (!this.banner) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/banners/${this.id}/${this.banner}.png${size}`;
  }
}
