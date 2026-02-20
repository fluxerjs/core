import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import { emitDeprecationWarning } from '@fluxerjs/util';
import { FluxerAPIError, RateLimitError } from '@fluxerjs/rest';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { buildSendBody, resolveMessageFiles } from '../util/messageUtils.js';
import type { MessageSendOptions } from '../util/messageUtils.js';
import type { Client } from './Client.js';
import { Channel, GuildChannel } from '../structures/Channel.js';

/**
 * Manages channels with fetch and send.
 * Extends Collection so you can use .get(), .set(), .filter(), etc.
 */
export class ChannelManager extends Collection<string, Channel | GuildChannel> {
  private readonly maxSize: number;

  constructor(private readonly client: Client) {
    super();
    this.maxSize = client.options?.cache?.channels ?? 0;
  }

  override set(key: string, value: Channel): this {
    if (this.maxSize > 0 && this.size >= this.maxSize && !this.has(key)) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) this.delete(firstKey);
    }
    return super.set(key, value);
  }

  /**
   * Get a channel from cache or fetch from the API if not present.
   * Convenience helper to avoid repeating `client.channels.get(id) ?? (await client.channels.fetch(id))`.
   * @param channelId - Snowflake of the channel
   * @returns The channel
   * @throws FluxerError with CHANNEL_NOT_FOUND if the channel does not exist
   * @example
   * const channel = await client.channels.resolve(message.channelId);
   * if (channel?.isSendable()) await channel.send('Hello!');
   */
  async resolve(channelId: string): Promise<Channel> {
    return this.get(channelId) ?? this.fetch(channelId);
  }

  /**
   * Fetch a channel by ID from the API (or return from cache if present).
   * @param channelId - Snowflake of the channel
   * @returns The channel
   * @throws FluxerError with CHANNEL_NOT_FOUND if the channel does not exist
   * @example
   * const channel = await client.channels.fetch(channelId);
   * if (channel?.isSendable()) await channel.send('Hello!');
   */
  async fetch(channelId: string): Promise<Channel> {
    const cached = this.get(channelId);
    if (cached) return cached;

    try {
      const { Channel } = await import('../structures/Channel.js');
      const data = await this.client.rest.get<import('@fluxerjs/types').APIChannel>(
        Routes.channel(channelId),
      );
      const channel = Channel.fromOrCreate(this.client, data);
      if (!channel) {
        throw new FluxerError('Channel data invalid or unsupported type', {
          code: ErrorCodes.ChannelNotFound,
        });
      }
      this.set(channel.id, channel);
      if ('guildId' in channel && channel.guildId) {
        const guild = this.client.guilds.get(channel.guildId);
        if (guild)
          guild.channels.set(
            channel.id,
            channel as import('../structures/Channel.js').GuildChannel,
          );
      }
      return channel;
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      if (err instanceof FluxerAPIError && err.statusCode === 404) {
        throw new FluxerError(`Channel ${channelId} not found`, {
          code: ErrorCodes.ChannelNotFound,
          cause: err,
        });
      }
      throw err instanceof FluxerError
        ? err
        : new FluxerError(String(err), { cause: err as Error });
    }
  }

  /**
   * Fetch a message by ID from the API.
   * @param channelId - Snowflake of the channel
   * @param messageId - Snowflake of the message
   * @returns The message
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   * @deprecated Use channel.messages.fetch(messageId). Prefer (await client.channels.resolve(channelId))?.messages?.fetch(messageId).
   * @example
   * const channel = await client.channels.resolve(channelId);
   * const message = await channel?.messages?.fetch(messageId);
   */
  async fetchMessage(
    channelId: string,
    messageId: string,
  ): Promise<import('../structures/Message.js').Message> {
    emitDeprecationWarning(
      'ChannelManager.fetchMessage()',
      'Use channel.messages.fetch(messageId). Prefer (await client.channels.resolve(channelId))?.messages?.fetch(messageId).',
    );
    try {
      const { Message } = await import('../structures/Message.js');
      const data = await this.client.rest.get<import('@fluxerjs/types').APIMessage>(
        Routes.channelMessage(channelId, messageId),
      );
      return new Message(this.client, data);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      if (err instanceof FluxerAPIError && err.statusCode === 404) {
        throw new FluxerError(`Message ${messageId} not found in channel ${channelId}`, {
          code: ErrorCodes.MessageNotFound,
          cause: err,
        });
      }
      throw err instanceof FluxerError
        ? err
        : new FluxerError(String(err), { cause: err as Error });
    }
  }

  /**
   * Send a message to a channel by ID. Works even when the channel is not cached.
   * Skips the fetch when you only need to send.
   * @param channelId - Snowflake of the channel (text channel or DM)
   * @param payload - Text content or object with content, embeds, and/or files
   * @returns The created message
   * @example
   * await client.channels.send(logChannelId, 'User joined!');
   * await client.channels.send(channelId, { embeds: [embed] });
   * await client.channels.send(channelId, { content: 'Report', files: [{ name: 'log.txt', data }] });
   */
  async send(
    channelId: string,
    payload: MessageSendOptions,
  ): Promise<import('../structures/Message.js').Message> {
    const opts = typeof payload === 'string' ? { content: payload } : payload;
    const body = buildSendBody(payload);
    const { Message } = await import('../structures/Message.js');
    const files = opts.files?.length ? await resolveMessageFiles(opts.files) : undefined;
    const postOptions = files?.length ? { body, files } : { body };
    const data = await this.client.rest.post(Routes.channelMessages(channelId), postOptions);
    return new Message(this.client, data as import('@fluxerjs/types').APIMessage);
  }
}
