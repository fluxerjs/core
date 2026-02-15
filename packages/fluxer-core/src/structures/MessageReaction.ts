import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { Message } from './Message.js';
import type { Guild } from './Guild.js';
import type {
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
    data: GatewayMessageReactionAddDispatchData | GatewayMessageReactionRemoveDispatchData
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
    return this.guildId ? this.client.guilds.get(this.guildId) ?? null : null;
  }

  /**
   * Fetch the message this reaction belongs to.
   * Use when you need to edit, delete, or otherwise interact with the message.
   */
  async fetchMessage(): Promise<Message | null> {
    return this.client.channels.fetchMessage(this.channelId, this.messageId);
  }
}
