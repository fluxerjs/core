import { Routes } from '@fluxerjs/types';
import { FluxerAPIError, RateLimitError } from '@fluxerjs/rest';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
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
    try {
      const { Message } = await import('../structures/Message.js');
      const data = await this.client.rest.get<import('@fluxerjs/types').APIMessage>(
        Routes.channelMessage(this.channelId, messageId),
      );
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
