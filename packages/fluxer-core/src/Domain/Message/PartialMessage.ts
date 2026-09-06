import { SnowflakeUtil } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import type { Channel, TextBasedChannel } from '../Channel/index.js';
import type { User } from '../User.js';
import type { Message } from './Message.js';

/**
 * Uncached or incomplete message (`MessageDelete`, uncached `MessageUpdate`,
 * `MessageDeleteBulk` entries). Not a {@link Message}: no `edit()` / `reply()`.
 * Call {@link fetch} to hydrate, or narrow with `message.partial`.
 */
export class PartialMessage {
  readonly partial = true as const;
  readonly client: Client;
  readonly id: string;
  readonly channelId: string;
  readonly guildId: string | null;
  readonly content: string | null;
  readonly authorId: string | null;
  readonly author: User | null;
  readonly createdAt: Date | null;

  constructor(
    client: Client,
    data: {
      id: string;
      channelId: string;
      guildId?: string | null;
      channel?: TextBasedChannel | null;
      content?: string | null;
      authorId?: string | null;
      author?: User | null;
      createdAt?: Date | null;
    },
  ) {
    this.client = client;
    this.id = data.id;
    this.channelId = data.channelId;
    this.guildId = data.guildId ?? null;
    this.content = data.content ?? null;
    this.authorId = data.authorId ?? null;
    this.author = data.author ?? null;
    this.createdAt =
      data.createdAt ??
      (SnowflakeUtil.isValid(data.id) ? SnowflakeUtil.dateFromSnowflake(data.id) : null);
  }

  /**
   * Live text-capable channel from cache, or null if uncached / not text-based.
   * Same contract as {@link Message.channel}.
   */
  get channel(): TextBasedChannel | null {
    const channel = this.client.channels.get(this.channelId) ?? null;
    return channel?.isTextBased() ? channel : null;
  }

  /**
   * Fetch this message's channel (cache first). The returned {@link Channel}
   * has {@link Channel.delete} and {@link Channel.send}.
   * @example
   * const channel = await message.resolveChannel();
   * await channel.delete();
   */
  async resolveChannel(): Promise<Channel> {
    return this.client.channels.resolve(this.channelId);
  }

  /**
   * Fetch the full message from the API.
   * @example
   * const message = await partial.fetch();
   * await message.reply('Pong!');
   */
  async fetch(): Promise<Message> {
    return this.client.channels.fetchMessage(this.channelId, this.id);
  }
}
