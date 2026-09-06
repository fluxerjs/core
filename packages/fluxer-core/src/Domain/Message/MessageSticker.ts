import type { APIMessageSticker } from '@fluxerjs/types';
import { SnowflakeUtil } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import { cdnStickerURL } from '../../Helpers/Cdn.js';
import { Base } from '../Base.js';

/** Sticker attached to a message (domain view of {@link APIMessageSticker}). */
export class MessageSticker extends Base {
  readonly client: Client;
  readonly id: string;
  name: string;
  description: string;
  tags: string[];
  readonly animated: boolean;

  constructor(client: Client, data: APIMessageSticker) {
    super();
    this.client = client;
    this.id = data.id;
    this.name = data.name;
    this.description = data.description ?? '';
    this.tags = data.tags ?? [];
    this.animated = data.animated ?? false;
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
}
