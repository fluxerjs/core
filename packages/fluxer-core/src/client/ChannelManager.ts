import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import type { Client } from './Client.js';
import type { Channel } from '../structures/Channel.js';

/**
 * Manages channels with fetch and send.
 * Extends Collection so you can use .get(), .set(), .filter(), etc.
 */
export class ChannelManager extends Collection<string, Channel> {
  constructor(private readonly client: Client) {
    super();
  }

  /**
   * Fetch a channel by ID from the API (or return from cache if present).
   * @param channelId - Snowflake of the channel
   * @returns The channel, or null if not found
   * @example
   * const channel = await client.channels.fetch(channelId);
   * if (channel?.isSendable()) await channel.send('Hello!');
   */
  async fetch(channelId: string): Promise<Channel | null> {
    const cached = this.get(channelId);
    if (cached) return cached;

    try {
      const { Channel } = await import('../structures/Channel.js');
      const data = await this.client.rest.get<import('@fluxerjs/types').APIChannel>(
        Routes.channel(channelId)
      );
      const channel = Channel.fromOrCreate(this.client, data);
      if (channel) this.set(channel.id, channel);
      return channel;
    } catch {
      return null;
    }
  }

  /**
   * Fetch a message by ID from the API.
   * @param channelId - Snowflake of the channel
   * @param messageId - Snowflake of the message
   * @returns The message, or null if not found
   * @deprecated Use channel.messages.fetch(messageId). Prefer (await client.channels.fetch(channelId))?.messages?.fetch(messageId).
   * @example
   * const channel = await client.channels.fetch(channelId);
   * const message = await channel?.messages?.fetch(messageId);
   */
  async fetchMessage(
    channelId: string,
    messageId: string
  ): Promise<import('../structures/Message.js').Message | null> {
    try {
      const { Message } = await import('../structures/Message.js');
      const data = await this.client.rest.get<import('@fluxerjs/types').APIMessage>(
        Routes.channelMessage(channelId, messageId)
      );
      return new Message(this.client, data);
    } catch {
      return null;
    }
  }

  /**
   * Send a message to a channel by ID. Works even when the channel is not cached.
   * Skips the fetch when you only need to send.
   * @param channelId - Snowflake of the channel (text channel or DM)
   * @param payload - Text content or object with content and/or embeds
   * @returns The created message
   * @example
   * await client.channels.send(logChannelId, 'User joined!');
   * await client.channels.send(channelId, { embeds: [embed.toJSON()] });
   */
  async send(
    channelId: string,
    payload: string | { content?: string; embeds?: import('@fluxerjs/types').APIEmbed[] }
  ): Promise<import('../structures/Message.js').Message> {
    const body = typeof payload === 'string' ? { content: payload } : payload;
    const { Message } = await import('../structures/Message.js');
    const data = await this.client.rest.post(Routes.channelMessages(channelId), { body });
    return new Message(this.client, data as import('@fluxerjs/types').APIMessage);
  }
}
