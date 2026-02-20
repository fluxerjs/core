import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { APISticker } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { CDN_URL } from '../util/Constants.js';

/** Represents a custom sticker in a guild. */
export class GuildSticker extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  name: string;
  description: string;
  readonly tags: string[];
  readonly animated: boolean;

  /** @param data - API sticker from GET /guilds/{id}/stickers or guild sticker events */
  constructor(client: Client, data: APISticker & { guild_id?: string }, guildId: string) {
    super();
    this.client = client;
    this.id = data.id;
    this.guildId = data.guild_id ?? guildId;
    this.name = data.name;
    this.description = data.description ?? '';
    this.tags = data.tags ?? [];
    this.animated = data.animated ?? false;
  }

  /** CDN URL for this sticker image. */
  get url(): string {
    const ext = this.animated ? 'gif' : 'png';
    return `${CDN_URL}/stickers/${this.id}.${ext}`;
  }

  /** Delete this sticker. Requires Manage Emojis and Stickers permission. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.guildSticker(this.guildId, this.id), {
      auth: true,
    });
  }

  /**
   * Edit this sticker's name and/or description.
   * Requires Manage Emojis and Stickers permission.
   */
  async edit(options: { name?: string; description?: string }): Promise<GuildSticker> {
    const data = await this.client.rest.patch(Routes.guildSticker(this.guildId, this.id), {
      body: options,
      auth: true,
    });
    const s = data as APISticker;
    this.name = s.name;
    this.description = s.description ?? '';
    return this;
  }
}
