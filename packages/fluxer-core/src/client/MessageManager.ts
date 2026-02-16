import type { Client } from './Client.js';

/**
 * Manages messages for a channel. Access via channel.messages.
 * @example
 * const message = await channel.messages.fetch(messageId);
 * if (message) await message.edit({ content: 'Updated!' });
 */
export class MessageManager {
  constructor(
    private readonly client: Client,
    private readonly channelId: string,
  ) {}

  /**
   * Fetch a message by ID from this channel.
   * @param messageId - Snowflake of the message
   * @returns The message
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   */
  async fetch(messageId: string): Promise<import('../structures/Message.js').Message> {
    return this.client.channels.fetchMessage(this.channelId, messageId);
  }
}
