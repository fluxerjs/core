import { APIMessage, Routes } from '@fluxerjs/types';
import { FluxerAPIError, RateLimitError } from '@fluxerjs/rest';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { Client } from './Client.js';
import { Message } from '../structures/Message';

/**
 * Manages messages for a channel. Access via channel.messages.
 * @example
 * const message = channel.messages.get(messageId);  // from cache (if enabled)
 * const message = await channel.messages.fetch(messageId);  // from API
 * if (message) await message.edit({ content: 'Updated!' });
 */
export class MessageManager {
  constructor(
    private readonly client: Client,
    private readonly channelId: string,
  ) {}

  /**
   * Get a message from cache. Returns undefined if not cached or caching is disabled.
   * Requires options.cache.messages > 0.
   * @param messageId - Snowflake of the message
   */
  get(messageId: string): Message | undefined {
    const data = this.client._getMessageCache(this.channelId)?.get(messageId);
    return data ? new Message(this.client, data) : undefined;
  }

  /**
   * Fetch a message by ID from this channel.
   * When message caching is enabled, the fetched message is added to the cache.
   * @param messageId - Snowflake of the message
   * @returns The message
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   */
  async fetch(messageId: string): Promise<Message> {
    try {
      const data = await this.client.rest.get<APIMessage>(
        Routes.channelMessage(this.channelId, messageId),
      );
      this.client._addMessageToCache(this.channelId, data);
      return new Message(this.client, data);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      if (err instanceof FluxerAPIError && err.statusCode === 404) {
        throw new FluxerError(`Message ${messageId} not found in channel ${this.channelId}`, {
          code: ErrorCodes.MessageNotFound,
          cause: err,
        });
      }
      throw err instanceof FluxerError
        ? err
        : new FluxerError(String(err), { cause: err as Error });
    }
  }
}
