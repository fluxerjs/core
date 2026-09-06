import type {
  APIMessage,
  APIMessageReaction,
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData,
} from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import type { ReactionEmojiPayload } from '../../ClientCore/EventPayloads.js';
import { rethrowMapped } from '../../Helpers/HttpErrors.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { Base } from '../Base.js';
import type { TextBasedChannel } from '../Channel/index.js';
import type { Guild } from '../Guild/index.js';
import { Message } from './Message.js';

type GatewayReactionData =
  | GatewayMessageReactionAddDispatchData
  | GatewayMessageReactionRemoveDispatchData;

/** Context needed to hydrate a reaction aggregate from a message payload. */
export type MessageReactionContext = {
  client: Client;
  id: string;
  channelId: string;
  guildId: string | null;
};

/** Represents a reaction on a message (gateway event or message aggregate). */
export class MessageReaction extends Base {
  readonly client: Client;
  readonly messageId: string;
  readonly channelId: string;
  readonly guildId: string | null;
  readonly emoji: ReactionEmojiPayload;
  /** Total count when hydrated from a message payload; `1` for gateway add events. */
  count: number;
  /** Whether the current user reacted (message payload); false for gateway remove. */
  me: boolean;
  /** Raw gateway payload for low-level access (null when built from a message aggregate). */
  readonly _data: GatewayReactionData | null;

  constructor(client: Client, data: GatewayReactionData) {
    super();
    this.client = client;
    this._data = data;
    this.messageId = data.message_id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.emoji = {
      name: data.emoji.name,
      ...(data.emoji.id !== undefined ? { id: data.emoji.id } : {}),
      ...(data.emoji.animated !== undefined ? { animated: data.emoji.animated } : {}),
    };
    this.count = 1;
    this.me = false;
  }

  /** Build a reaction aggregate from a message's `reactions` array entry. */
  static fromMessage(message: MessageReactionContext, data: APIMessageReaction): MessageReaction {
    const reaction = new MessageReaction(message.client, {
      user_id: message.client.user?.id ?? '0',
      message_id: message.id,
      channel_id: message.channelId,
      guild_id: message.guildId ?? undefined,
      emoji: {
        name: data.emoji.name,
        id: data.emoji.id ?? undefined,
        animated: data.emoji.animated ?? undefined,
      },
    });
    Object.defineProperty(reaction, '_data', { value: null });
    reaction.count = data.count;
    reaction.me = data.me ?? false;
    return reaction;
  }

  /** Emoji as a string for reaction routes: unicode or `name:id` (`a:name:id` when animated). */
  get emojiIdentifier(): string {
    return this.emoji.id
      ? this.emoji.animated
        ? `a:${this.emoji.name}:${this.emoji.id}`
        : `${this.emoji.name}:${this.emoji.id}`
      : this.emoji.name;
  }

  /** Guild where this reaction was added. Resolved from cache; null for DMs or if not cached. */
  get guild(): Guild | null {
    return this.guildId ? (this.client.guilds.get(this.guildId) ?? null) : null;
  }

  /** Cached message this reaction belongs to, or null if the message was not cached. */
  get message(): Message | null {
    const cached = this.client._getMessageCache(this.channelId)?.get(this.messageId);
    return cached ? new Message(this.client, cached) : null;
  }

  /** Cached text-capable channel, or null if uncached / not text-based. */
  get channel(): TextBasedChannel | null {
    const channel = this.client.channels.get(this.channelId);
    return channel?.isTextBased() ? channel : null;
  }

  /**
   * Fetch the message this reaction belongs to (cache first, then REST).
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   */
  async fetchMessage(): Promise<Message> {
    const cached = this.message;
    if (cached) return cached;
    try {
      const data = await this.client.rest.get<APIMessage>(
        Routes.channelMessage(this.channelId, this.messageId),
      );
      return new Message(this.client, data);
    } catch (err) {
      rethrowMapped(err, {
        notFound: {
          code: ErrorCodes.MessageNotFound,
          message: `Message ${this.messageId} not found in channel ${this.channelId}`,
        },
        fallback: `Failed to fetch message ${this.messageId}`,
      });
    }
  }
}
