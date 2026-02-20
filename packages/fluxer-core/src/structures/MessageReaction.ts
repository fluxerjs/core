import { APIMessage, Routes } from '@fluxerjs/types';
import { FluxerAPIError, RateLimitError } from '@fluxerjs/rest';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Message } from './Message.js';
import { Guild } from './Guild.js';
import {
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData,
  GatewayReactionEmoji,
} from '@fluxerjs/types';

/** Represents a reaction added to or removed from a message. */
export class MessageReaction extends Base {
  readonly client: Client;
  readonly messageId: string;
  readonly channelId: string;
  readonly guildId: string | null;
  readonly emoji: GatewayReactionEmoji;
  /** Raw gateway payload for low-level access. */
  readonly _data: GatewayMessageReactionAddDispatchData | GatewayMessageReactionRemoveDispatchData;

  constructor(
    client: Client,
    data: GatewayMessageReactionAddDispatchData | GatewayMessageReactionRemoveDispatchData,
  ) {
    super();
    this.client = client;
    this._data = data;
    this.messageId = data.message_id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.emoji = data.emoji;
  }

  /** Emoji as a string: unicode or "name:id" for custom. */
  get emojiIdentifier(): string {
    return this.emoji.id ? `${this.emoji.name}:${this.emoji.id}` : this.emoji.name;
  }

  /** Guild where this reaction was added. Resolved from cache; null for DMs or if not cached. */
  get guild(): Guild | null {
    return this.guildId ? (this.client.guilds.get(this.guildId) ?? null) : null;
  }

  /**
   * Fetch the message this reaction belongs to.
   * Use when you need to edit, delete, or otherwise interact with the message.
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   */
  async fetchMessage(): Promise<Message> {
    try {
      const data = await this.client.rest.get<APIMessage>(
        Routes.channelMessage(this.channelId, this.messageId),
      );
      return new Message(this.client, data);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      if (err instanceof FluxerAPIError && err.statusCode === 404) {
        throw new FluxerError(`Message ${this.messageId} not found in channel ${this.channelId}`, {
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
