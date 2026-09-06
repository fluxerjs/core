import { EmbedBuilder } from '@fluxerjs/builders';
import { Collection } from '@fluxerjs/collection';
import {
  type APIAllowedMentions,
  type APIMessage,
  type APIMessageCall,
  type APIMessageSnapshot,
  MessageType,
  type RESTPostAPIEmbed,
  Routes,
} from '@fluxerjs/types';
import { MessageFlagsBitField } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import { toMessageAttachmentEditWire } from '../../ClientCore/SdkOptions/index.js';
import {
  type MessagePrepareInput,
  type MessageSendOptions,
  toAPIAllowedMentions,
} from '../../Helpers/MessageUtils/index.js';
import {
  type CollectedReaction,
  ReactionCollector,
  type ReactionCollectorEndReason,
  type ReactionCollectorOptions,
} from '../../Helpers/ReactionCollector.js';
import { Base } from '../Base.js';
import type { Channel, TextBasedChannel } from '../Channel/index.js';
import type { GuildMember } from '../Guild/GuildMember.js';
import type { Guild } from '../Guild/index.js';
import type { User } from '../User.js';
import { type MessageAttachment, toMessageAttachment } from './Attachment.js';
import { type MessageEmbed, toMessageEmbed } from './Embed.js';
import { MessageReactionManager } from './MessageReactionManager.js';
import { MessageSticker } from './MessageSticker.js';
import type { PartialMessage } from './PartialMessage.js';
import {
  fetchMessageReactionUsers,
  fetchMessageReactionUsersPage,
  reactToMessage,
  removeAllMessageReactions,
  removeMessageReaction,
  removeMessageReactionEmoji,
} from './Reactions.js';
import {
  createMessageBody,
  replyToMessage,
  sendMessage,
  sendMessageTo,
  sendPrepared,
} from './Send.js';
import type {
  MessageCall,
  MessageEditOptions,
  MessageReference,
  MessageSnapshot,
  PreparedMessagePost,
  ReplyOptions,
} from './Types.js';

type EmojiInput = string | { name: string; id?: string; animated?: boolean };

function toMessageCall(data: APIMessageCall): MessageCall {
  return {
    participants: data.participants,
    endedAt: data.ended_timestamp ? new Date(data.ended_timestamp) : null,
  };
}

function toMessageSnapshot(client: Client, data: APIMessageSnapshot): MessageSnapshot {
  return {
    content: data.content ?? null,
    createdAt: new Date(data.timestamp),
    editedAt: data.edited_timestamp ? new Date(data.edited_timestamp) : null,
    mentionUserIds: data.mentions ?? [],
    mentionRoles: data.mention_roles ?? [],
    embeds: (data.embeds ?? []).map(toMessageEmbed),
    attachments: (data.attachments ?? []).map(toMessageAttachment),
    stickers: (data.stickers ?? []).map((s) => new MessageSticker(client, s)),
    ...(data.type !== undefined ? { type: data.type } : {}),
  };
}

function resolveMessageFlags(flags: MessageEditOptions['flags']): number | undefined {
  if (flags === undefined) return undefined;
  if (typeof flags === 'number') return flags;
  return Number(MessageFlagsBitField.resolve(flags));
}

/** A message in a channel. */
export class Message extends Base {
  /** Discriminant vs {@link PartialMessage}: always `false` on a hydrated Message. */
  readonly partial = false as const;
  /** The {@link Client} that instantiated this message. */
  readonly client: Client;
  /** Snowflake ID of this message. */
  readonly id: string;
  /** Channel ID where this message was sent. */
  readonly channelId: string;
  /** Guild ID if in a guild channel, null for DMs. */
  readonly guildId: string | null;
  /** The user who sent this message. */
  readonly author: User;
  /** Text content of the message. */
  content: string;
  /** When the message was created. */
  readonly createdAt: Date;
  /** When the message was last edited, or null if never edited. */
  editedAt: Date | null;
  /** Whether the message is pinned. */
  pinned: boolean;
  /** Attached files (images, videos, etc.). */
  readonly attachments: Collection<string, MessageAttachment>;
  /** Message type (Default, Reply, etc.). */
  readonly type: MessageType;
  /** Message flags bitfield. */
  flags: MessageFlagsBitField;
  /** Whether `@everyone` or `@here` was mentioned. */
  mentionEveryone: boolean;
  /** Whether this is a text-to-speech message. */
  tts: boolean;
  /** Embedded content (camelCase read view; send with {@link EmbedBuilder}). */
  embeds: MessageEmbed[];
  /** Stickers sent with the message. */
  stickers: MessageSticker[];
  /** Reactions on the message. */
  readonly reactions: MessageReactionManager;
  /** Reference to a replied-to message, if any. */
  messageReference: MessageReference | null;
  /** Message snapshots for forwarded messages. */
  messageSnapshots: MessageSnapshot[];
  /** Call data if this message represents a call event. */
  call: MessageCall | null;
  /** The full referenced (replied-to) message, or null. */
  referencedMessage: Message | null;
  /** Webhook ID if sent by a webhook. */
  webhookId: string | null;
  /** Users mentioned in the message. */
  mentions: User[];
  /** Role IDs mentioned in the message. */
  mentionRoles: string[];
  /** Client-side nonce for deduplication. */
  nonce: string | null;

  /**
   * Cached text-capable channel (guild text, guild voice, or DM), or null if uncached / not text-based.
   * Narrowed type has {@link Channel.send} and {@link Channel.delete}.
   */
  get channel(): TextBasedChannel | null {
    const channel = this.client.channels.get(this.channelId) ?? null;
    return channel?.isTextBased() ? channel : null;
  }

  /** Cached guild, or null for DMs / uncached. */
  get guild(): Guild | null {
    return this.guildId ? (this.client.guilds.get(this.guildId) ?? null) : null;
  }

  /** Cached guild member for the author, or null in DMs / if uncached. */
  get member(): GuildMember | null {
    return this.guild?.members.get(this.author.id) ?? null;
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
   * Fetch and resolve the guild, or null if a DM.
   * Propagates network/auth errors; only returns null when there is no guildId.
   * @example
   * const guild = await message.resolveGuild();
   */
  async resolveGuild(): Promise<Guild | null> {
    if (!this.guildId) return null;
    return this.client.guilds.resolve(this.guildId);
  }

  /**
   * Construct a message from API data.
   * @param data - API message from REST or MESSAGE_CREATE
   */
  constructor(client: Client, data: APIMessage) {
    super();
    this.client = client;
    this.id = data.id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.author = client.getOrCreateUser(data.author);
    this.content = data.content;
    this.createdAt = new Date(data.timestamp);
    this.editedAt = data.edited_timestamp ? new Date(data.edited_timestamp) : null;
    this.pinned = data.pinned;
    this.attachments = new Collection();
    for (const a of data.attachments ?? []) this.attachments.set(a.id, toMessageAttachment(a));
    this.type = (data.type ?? MessageType.Default) as MessageType;
    this.flags = new MessageFlagsBitField(BigInt(data.flags ?? 0));
    this.mentionEveryone = data.mention_everyone ?? false;
    this.tts = data.tts ?? false;
    this.embeds = (data.embeds ?? []).map(toMessageEmbed);
    this.stickers = (data.stickers ?? []).map((s) => new MessageSticker(client, s));
    this.reactions = new MessageReactionManager(this);
    this.reactions._patch(data.reactions);
    this.messageReference = data.message_reference
      ? {
          channelId: data.message_reference.channel_id,
          messageId: data.message_reference.message_id,
          guildId: data.message_reference.guild_id ?? null,
          ...(data.message_reference.type !== undefined
            ? { type: data.message_reference.type }
            : {}),
        }
      : null;
    this.messageSnapshots = (data.message_snapshots ?? []).map((s) => toMessageSnapshot(client, s));
    this.call = data.call ? toMessageCall(data.call) : null;
    this.referencedMessage = data.referenced_message
      ? new Message(client, data.referenced_message)
      : null;
    this.webhookId = data.webhook_id ?? null;
    this.mentions = (data.mentions ?? []).map((u) => client.getOrCreateUser(u));
    this.mentionRoles = data.mention_roles ?? [];
    this.nonce = data.nonce ?? null;
  }

  /**
   * Apply an API message payload in place (cache identity / MESSAGE_UPDATE).
   * @internal
   */
  _patch(data: APIMessage): void {
    this.content = data.content;
    this.editedAt = data.edited_timestamp ? new Date(data.edited_timestamp) : null;
    this.pinned = data.pinned;
    this.attachments.clear();
    for (const a of data.attachments ?? []) this.attachments.set(a.id, toMessageAttachment(a));
    this.flags = new MessageFlagsBitField(BigInt(data.flags ?? 0));
    this.mentionEveryone = data.mention_everyone ?? false;
    this.tts = data.tts ?? false;
    this.embeds = (data.embeds ?? []).map(toMessageEmbed);
    this.stickers = (data.stickers ?? []).map((s) => new MessageSticker(this.client, s));
    this.reactions._patch(data.reactions);
    this.messageReference = data.message_reference
      ? {
          channelId: data.message_reference.channel_id,
          messageId: data.message_reference.message_id,
          guildId: data.message_reference.guild_id ?? null,
          ...(data.message_reference.type !== undefined
            ? { type: data.message_reference.type }
            : {}),
        }
      : null;
    this.messageSnapshots = (data.message_snapshots ?? []).map((s) =>
      toMessageSnapshot(this.client, s),
    );
    this.call = data.call ? toMessageCall(data.call) : null;
    this.referencedMessage = data.referenced_message
      ? new Message(this.client, data.referenced_message)
      : null;
    this.webhookId = data.webhook_id ?? null;
    this.mentions = (data.mentions ?? []).map((u) => this.client.getOrCreateUser(u));
    this.mentionRoles = data.mention_roles ?? [];
    this.nonce = data.nonce ?? null;
  }

  /**
   * Send a standalone message in this channel (not a reply).
   * Prefer {@link Channel.send} or {@link reply} when you already have the channel or are answering.
   */
  async send(options: MessagePrepareInput): Promise<Message> {
    return sendMessage(this, options);
  }

  /**
   * Send a message to another channel by ID.
   * Prefer `client.channels.fetch(channelId)` then {@link Channel.send}.
   */
  async sendTo(channelId: string, options: MessagePrepareInput): Promise<Message> {
    return sendMessageTo(this, channelId, options);
  }

  /**
   * Reply to this message.
   * @example
   * await message.reply('Pong!');
   * await message.reply('No ping!', { ping: false });
   * await message.reply({ content: 'Silent', allowedMentions: AllowedMentions.suppressReplyPing });
   */
  async reply(
    options: string | (MessageSendOptions & ReplyOptions),
    replyOptions?: ReplyOptions,
  ): Promise<Message> {
    return replyToMessage(this, options, replyOptions);
  }

  /**
   * Hydrate a partial message, or return the message as-is.
   * @example
   * client.on(Events.MessageUpdate, async (_old, msg) => {
   *   const message = await Message.resolve(msg);
   * });
   */
  static async resolve(message: Message | PartialMessage): Promise<Message> {
    return message.partial ? message.fetch() : message;
  }

  /** Test helper — prefer {@link reply} / `prepareMessagePostPayload()`. */
  static async _createMessageBody(
    content: string | MessageSendOptions,
    referenced_message?: { channel_id: string; message_id: string; guild_id?: string },
    ping?: boolean,
  ): Promise<PreparedMessagePost> {
    return createMessageBody(content, referenced_message, ping);
  }

  /** Send a prepared payload (internal helper). */
  async _send(payload: PreparedMessagePost): Promise<Message> {
    return sendPrepared(this, payload);
  }

  /** Edit this message (requires author or admin permissions). */
  async edit(options: MessageEditOptions): Promise<Message> {
    const body: {
      content?: string | null;
      embeds?: RESTPostAPIEmbed[];
      allowed_mentions?: APIAllowedMentions;
      flags?: number;
      attachments?: Array<Record<string, unknown>>;
    } = {};
    if (options.content !== undefined) body.content = options.content;
    // `embeds: []` clears; omit leaves embeds unchanged.
    if (options.embeds !== undefined) {
      body.embeds = options.embeds.map((e) =>
        e instanceof EmbedBuilder ? e.toJSON() : (e as RESTPostAPIEmbed),
      );
    }
    if (options.allowedMentions) {
      body.allowed_mentions = toAPIAllowedMentions(options.allowedMentions);
    }
    const flags = resolveMessageFlags(options.flags);
    if (flags !== undefined) body.flags = flags;
    // `attachments: []` clears; omit leaves attachments unchanged.
    if (options.attachments !== undefined) {
      body.attachments = toMessageAttachmentEditWire(options.attachments);
    }
    const data = await this.client.rest.patch(Routes.channelMessage(this.channelId, this.id), {
      body,
    });
    const updated = new Message(this.client, data as APIMessage);
    this.client._addMessageToCache(this.channelId, data as APIMessage);
    return updated;
  }

  /** Create a {@link ReactionCollector} for this message. */
  createReactionCollector(options?: ReactionCollectorOptions): ReactionCollector {
    return new ReactionCollector(this.client, this.id, this.channelId, options);
  }

  /**
   * Wait for reactions matching the filter, then resolve the collected set.
   * Pass `errors: ['time']` to reject when the timer fires instead of resolving.
   */
  awaitReactions(
    options?: ReactionCollectorOptions & { errors?: ReactionCollectorEndReason[] },
  ): Promise<Collection<string, CollectedReaction>> {
    return ReactionCollector.awaitReactions(this.client, this.id, this.channelId, options);
  }

  /** Fetch the latest version of this message from the API. */
  async fetch(): Promise<Message> {
    return this.client.channels.fetchMessage(this.channelId, this.id);
  }

  /** Delete this message. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessage(this.channelId, this.id));
    this.client._removeMessageFromCache(this.channelId, this.id);
  }

  /** Delete a specific attachment from this message. */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.client.rest.delete(
      Routes.channelMessageAttachment(this.channelId, this.id, attachmentId),
      { auth: true },
    );
    this.attachments.delete(attachmentId);
  }

  /** Pin this message in the channel. */
  async pin(): Promise<void> {
    await this.client.rest.put(Routes.channelPinMessage(this.channelId, this.id));
    this.pinned = true;
  }

  /** Unpin this message from the channel. */
  async unpin(): Promise<void> {
    await this.client.rest.delete(Routes.channelPinMessage(this.channelId, this.id));
    this.pinned = false;
  }

  /** React to this message with an emoji. */
  async react(emoji: EmojiInput): Promise<void> {
    return reactToMessage(this, emoji);
  }

  /** Remove a reaction (bot's own or a user's if ID is provided). */
  async removeReaction(emoji: EmojiInput, userId?: string): Promise<void> {
    return removeMessageReaction(this, emoji, userId);
  }

  /** Remove all reactions from this message. */
  async removeAllReactions(): Promise<void> {
    return removeAllMessageReactions(this);
  }

  /** Remove all reactions of a specific emoji. */
  async removeReactionEmoji(emoji: EmojiInput): Promise<void> {
    return removeMessageReactionEmoji(this, emoji);
  }

  /** Fetch users who reacted with a specific emoji. */
  async fetchReactionUsers(
    emoji: EmojiInput,
    options?: { limit?: number; after?: string },
  ): Promise<User[]> {
    return fetchMessageReactionUsers(this, emoji, options);
  }

  /** Fetch reaction users with pagination metadata. */
  async fetchReactionUsersPage(
    emoji: EmojiInput,
    options?: { limit?: number; after?: string },
  ): Promise<{ users: User[]; hasMore: boolean; nextAfter: string | null }> {
    return fetchMessageReactionUsersPage(this, emoji, options);
  }
}
