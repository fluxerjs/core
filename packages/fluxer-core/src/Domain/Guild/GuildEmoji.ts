import type { APIEmoji } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { SnowflakeUtil } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import { cdnEmojiURL } from '../../Helpers/Cdn.js';
import { Base } from '../Base.js';

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

  /**
   * Patch mutable fields in place. Does not change `id` or `animated`
   * (callers should replace the instance when `animated` changes).
   * @internal
   */
  _patch(data: APIEmoji): void {
    if (data.name !== undefined) this.name = data.name;
  }

  /** CDN URL for this emoji image. */
  get url(): string {
    return cdnEmojiURL(this.id, this.animated, {
      mediaBase: this.client.instance.endpoints.media,
    });
  }

  /** Emoji identifier for use in reactions: `name:id` (or `a:name:id` when animated). */
  get identifier(): string {
    return this.animated ? `a:${this.name}:${this.id}` : `${this.name}:${this.id}`;
  }

  /** Unix timestamp (ms) when this emoji was created, derived from its snowflake ID. */
  get createdTimestamp(): number {
    return SnowflakeUtil.timestampFromSnowflake(this.id);
  }

  /** Date when this emoji was created, derived from its snowflake ID. */
  get createdAt(): Date {
    return SnowflakeUtil.dateFromSnowflake(this.id);
  }

  /** Renders this emoji for use in message content: `<:name:id>` (or `<a:name:id>` when animated). */
  toString(): string {
    return `<${this.animated ? 'a' : ''}:${this.name}:${this.id}>`;
  }

  /** Delete this emoji. Requires Manage Emojis and Stickers permission. */
  async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(Routes.guildEmoji(this.guildId, this.id), {
      auth: true,
      ...auditReasonHeaders(reason),
    });
    const guild = this.client.guilds.get(this.guildId);
    if (guild) guild.emojis.delete(this.id);
  }

  /**
   * Edit this emoji's name.
   * Requires Manage Emojis and Stickers permission.
   */
  async edit(options: { name: string; reason?: string }): Promise<GuildEmoji> {
    const { reason, name } = options;
    const data = await this.client.rest.patch(Routes.guildEmoji(this.guildId, this.id), {
      body: { name },
      auth: true,
      ...auditReasonHeaders(reason),
    });
    this.name = (data as APIEmoji).name;
    return this;
  }
}
