import type { APISticker } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { SnowflakeUtil } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import { cdnStickerURL } from '../../Helpers/Cdn.js';
import { Base } from '../Base.js';

/** Represents a custom sticker in a guild. */
export class GuildSticker extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  name: string;
  description: string;
  tags: string[];
  readonly animated: boolean;
  /** Whether this sticker is classified as NSFW */
  nsfw: boolean;

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
    this.nsfw = data.nsfw ?? false;
  }

  /**
   * Patch mutable fields in place. Does not change `id` or `animated`
   * (callers should replace the instance when `animated` changes).
   * @internal
   */
  _patch(data: APISticker): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.description !== undefined) this.description = data.description ?? '';
    if (data.tags !== undefined) this.tags = data.tags ?? [];
    if (data.nsfw !== undefined) this.nsfw = data.nsfw ?? false;
  }

  /** CDN URL for this sticker image. */
  get url(): string {
    return cdnStickerURL(this.id, this.animated, {
      mediaBase: this.client.instance.endpoints.media,
    });
  }

  /** Unix timestamp (ms) when this sticker was created, derived from its snowflake ID. */
  get createdTimestamp(): number {
    return SnowflakeUtil.timestampFromSnowflake(this.id);
  }

  /** Date when this sticker was created, derived from its snowflake ID. */
  get createdAt(): Date {
    return SnowflakeUtil.dateFromSnowflake(this.id);
  }

  /** Delete this sticker. Requires Manage Emojis and Stickers permission. */
  async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(Routes.guildSticker(this.guildId, this.id), {
      auth: true,
      ...auditReasonHeaders(reason),
    });
    const guild = this.client.guilds.get(this.guildId);
    if (guild) guild.stickers.delete(this.id);
  }

  /**
   * Edit this sticker's name and/or description.
   * Requires Manage Emojis and Stickers permission.
   */
  async edit(options: {
    name?: string;
    description?: string;
    reason?: string;
  }): Promise<GuildSticker> {
    const { reason, ...body } = options;
    const data = await this.client.rest.patch(Routes.guildSticker(this.guildId, this.id), {
      body,
      auth: true,
      ...auditReasonHeaders(reason),
    });
    const s = data as APISticker;
    this.name = s.name;
    this.description = s.description ?? '';
    return this;
  }
}
