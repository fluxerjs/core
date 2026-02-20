import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { APIEmoji } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { CDN_URL } from '../util/Constants.js';

/** Represents a custom emoji in a guild. */
export class GuildEmoji extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  name: string;
  readonly animated: boolean;

  /** @param data - API emoji from GET /guilds/{id}/emojis or guild emoji events */
  constructor(client: Client, data: APIEmoji & { guild_id?: string }, guildId: string) {
    super();
    this.client = client;
    this.id = data.id;
    this.guildId = data.guild_id ?? guildId;
    this.name = data.name;
    this.animated = data.animated ?? false;
  }

  /** CDN URL for this emoji image. */
  get url(): string {
    const ext = this.animated ? 'gif' : 'png';
    return `${CDN_URL}/emojis/${this.id}.${ext}`;
  }

  /** Emoji identifier for use in reactions: `name:id` */
  get identifier(): string {
    return `${this.name}:${this.id}`;
  }

  /** Delete this emoji. Requires Manage Emojis and Stickers permission. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.guildEmoji(this.guildId, this.id), {
      auth: true,
    });
  }

  /**
   * Edit this emoji's name.
   * Requires Manage Emojis and Stickers permission.
   */
  async edit(options: { name: string }): Promise<GuildEmoji> {
    const data = await this.client.rest.patch(Routes.guildEmoji(this.guildId, this.id), {
      body: options,
      auth: true,
    });
    this.name = (data as APIEmoji).name;
    return this;
  }
}
