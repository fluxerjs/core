import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type {
  APIMessage,
  APIMessageAttachment,
  APIMessageReaction,
  APIMessageSticker,
  APIMessageReference,
  APIMessageSnapshot,
  APIMessageCall,
  APIEmbed,
} from '@fluxerjs/types';
import { MessageType, Routes } from '@fluxerjs/types';
import { EmbedBuilder } from '@fluxerjs/builders';
import type { User } from './User.js';
import type { Channel } from './Channel.js';
import type { Guild } from './Guild.js';

import {
  buildSendBody,
  resolveMessageFiles,
  type MessageSendOptions,
} from '../util/messageUtils.js';
import { ReactionCollector } from '../util/ReactionCollector.js';
import type { ReactionCollectorOptions } from '../util/ReactionCollector.js';

/** Options for editing a message (content and/or embeds). */
export interface MessageEditOptions {
  /** New text content */
  content?: string;
  /** New embeds (replaces existing) */
  embeds?: (APIEmbed | EmbedBuilder)[];
}

/** Re-export for convenience. */
export type { MessageSendOptions } from '../util/messageUtils.js';

/** Represents a message in a channel. */
export class Message extends Base {
  readonly client: Client;
  readonly id: string;
  readonly channelId: string;
  readonly guildId: string | null;
  readonly author: User;
  content: string;
  readonly createdAt: Date;
  readonly editedAt: Date | null;
  pinned: boolean;
  readonly attachments: Collection<string, APIMessageAttachment>;
  readonly type: MessageType;
  readonly flags: number;
  readonly mentionEveryone: boolean;
  readonly tts: boolean;
  readonly embeds: APIEmbed[];
  readonly stickers: APIMessageSticker[];
  readonly reactions: APIMessageReaction[];
  readonly messageReference: APIMessageReference | null;
  readonly messageSnapshots: APIMessageSnapshot[];
  readonly call: APIMessageCall | null;
  readonly referencedMessage: Message | null;
  /** Webhook ID if this message was sent via webhook. Null otherwise. */
  readonly webhookId: string | null;
  /** Users mentioned in this message. */
  readonly mentions: User[];
  /** Role IDs mentioned in this message. */
  readonly mentionRoles: string[];
  /** Client-side nonce for acknowledgment. Null if not provided. */
  readonly nonce: string | null;

  /** Channel where this message was sent. Resolved from cache; null if not cached (e.g. DM channel not in cache). */
  get channel(): Channel | null {
    return this.client.channels.get(this.channelId) ?? null;
  }

  /** Guild where this message was sent. Resolved from cache; null for DMs or if not cached. */
  get guild(): Guild | null {
    return this.guildId ? (this.client.guilds.get(this.guildId) ?? null) : null;
  }

  /**
   * Resolve the channel (from cache or API). Use when you need the channel and it may not be cached.
   * @returns The channel
   * @throws FluxerError with CHANNEL_NOT_FOUND if the channel does not exist
   */
  async resolveChannel(): Promise<Channel> {
    return this.client.channels.resolve(this.channelId);
  }

  /**
   * Resolve the guild (from cache or API). Returns null for DMs.
   * @returns The guild, or null if this is a DM or guild not found
   */
  async resolveGuild(): Promise<Guild | null> {
    return this.guildId ? this.client.guilds.resolve(this.guildId) : null;
  }

  /** @param data - API message from POST/PATCH /channels/{id}/messages or gateway MESSAGE_CREATE */
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
    for (const a of data.attachments ?? []) this.attachments.set(a.id, a);
    this.type = (data.type ?? MessageType.Default) as MessageType;
    this.flags = data.flags ?? 0;
    this.mentionEveryone = data.mention_everyone ?? false;
    this.tts = data.tts ?? false;
    this.embeds = data.embeds ?? [];
    this.stickers = data.stickers ?? [];
    this.reactions = data.reactions ?? [];
    this.messageReference = data.message_reference ?? null;
    this.messageSnapshots = data.message_snapshots ?? [];
    this.call = data.call ?? null;
    this.referencedMessage = data.referenced_message
      ? new Message(client, data.referenced_message)
      : null;
    this.webhookId = data.webhook_id ?? null;
    this.mentions = (data.mentions ?? []).map((u) => client.getOrCreateUser(u));
    this.mentionRoles = data.mention_roles ?? [];
    this.nonce = data.nonce ?? null;
  }

  /**
   * Send a message to this channel without replying. Use when you want a standalone message.
   * @param options - Text content or object with content, embeds, and/or files
   * @example
   * await message.send('Pong!');
   * await message.send({ embeds: [embed] }); // EmbedBuilder auto-converted
   * await message.send({ content: 'File', files: [{ name: 'data.txt', data }] });
   */
  async send(options: MessageSendOptions): Promise<Message> {
    const opts = typeof options === 'string' ? { content: options } : options;
    const body = buildSendBody(options);
    const files = opts.files?.length ? await resolveMessageFiles(opts.files) : undefined;
    const postOptions = files?.length ? { body, files } : { body };
    const data = await this.client.rest.post(Routes.channelMessages(this.channelId), postOptions);
    return new Message(this.client, data as APIMessage);
  }

  /**
   * Send a message to a specific channel. Use for logging, forwarding, or sending to another channel in the guild.
   * @param channelId - Snowflake of the target channel (e.g. log channel ID)
   * @param options - Text content or object with content and/or embeds
   * @example
   * await message.sendTo(logChannelId, 'User ' + message.author.username + ' said: ' + message.content);
   * await message.sendTo(announceChannelId, { embeds: [embed] });
   */
  async sendTo(channelId: string, options: MessageSendOptions): Promise<Message> {
    return this.client.channels.send(channelId, options);
  }

  /**
   * Reply to this message (shows as a reply in the client).
   * @param options - Text content or object with content, embeds, and/or files
   * @example
   * await message.reply('Pong!');
   * await message.reply({ embeds: [embed] });
   */
  async reply(options: MessageSendOptions): Promise<Message> {
    const opts = typeof options === 'string' ? { content: options } : options;
    const base = buildSendBody(options);
    const body = {
      ...base,
      message_reference: {
        channel_id: this.channelId,
        message_id: this.id,
        guild_id: this.guildId ?? undefined,
      },
    };
    const files = opts.files?.length ? await resolveMessageFiles(opts.files) : undefined;
    const postOptions = files?.length ? { body, files } : { body };
    const data = await this.client.rest.post(Routes.channelMessages(this.channelId), postOptions);
    return new Message(this.client, data as APIMessage);
  }

  /**
   * Edit this message. Only the author (or admins) can edit.
   * @param options - New content and/or embeds
   */
  async edit(options: MessageEditOptions): Promise<Message> {
    const body: { content?: string; embeds?: APIEmbed[] } = {};
    if (options.content !== undefined) body.content = options.content;
    if (options.embeds?.length) {
      body.embeds = options.embeds.map((e) => (e instanceof EmbedBuilder ? e.toJSON() : e));
    }
    const data = await this.client.rest.patch(Routes.channelMessage(this.channelId, this.id), {
      body,
    });
    return new Message(this.client, data as APIMessage);
  }

  /**
   * Create a reaction collector for this message.
   * Collects reactions matching the filter until time expires or max is reached.
   * @param options - Filter, time (ms), and max count
   * @example
   * const collector = message.createReactionCollector({ filter: (r, u) => u.id === userId, time: 10000 });
   * collector.on('collect', (reaction, user) => console.log(user.username, 'reacted with', reaction.emoji.name));
   * collector.on('end', (collected, reason) => { ... });
   */
  createReactionCollector(options?: ReactionCollectorOptions): ReactionCollector {
    return new ReactionCollector(this.client, this.id, this.channelId, options);
  }

  /**
   * Re-fetch this message from the API to get the latest content, embeds, reactions, etc.
   * Use when you have a stale Message (e.g. from an old event or cache) and need fresh data.
   * @returns The updated message
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message was deleted or does not exist
   * @example
   * const updated = await message.fetch();
   * console.log('Latest content:', updated.content);
   */
  async fetch(): Promise<Message> {
    return this.client.channels.fetchMessage(this.channelId, this.id);
  }

  /** Delete this message. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessage(this.channelId, this.id));
  }

  /**
   * Delete a specific attachment from this message.
   * DELETE /channels/{id}/messages/{id}/attachments/{attachmentId}.
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.client.rest.delete(
      Routes.channelMessageAttachment(this.channelId, this.id, attachmentId),
      { auth: true },
    );
    this.attachments.delete(attachmentId);
  }

  /** Pin this message to the channel. Requires Manage Messages permission. */
  async pin(): Promise<void> {
    await this.client.rest.put(Routes.channelPinMessage(this.channelId, this.id));
    this.pinned = true;
  }

  /** Unpin this message from the channel. Requires Manage Messages permission. */
  async unpin(): Promise<void> {
    await this.client.rest.delete(Routes.channelPinMessage(this.channelId, this.id));
    this.pinned = false;
  }

  /**
   * Format emoji for reaction API: unicode string or "name:id" for custom.
   * For string resolution (e.g. :name:), use client.resolveEmoji; Message methods resolve automatically when guildId is available.
   */
  private static formatEmoji(emoji: string | { name: string; id: string }): string {
    if (typeof emoji === 'string') return emoji;
    return `${emoji.name}:${emoji.id}`;
  }

  private resolveEmojiForReaction(
    emoji: string | { name: string; id?: string; animated?: boolean },
  ): Promise<string> {
    return this.client.resolveEmoji(emoji, this.guildId);
  }

  /**
   * Add a reaction to this message (as the bot).
   * @param emoji - Unicode emoji, custom `{ name, id }`, `:name:`, `name:id`, or `<:name:id>`
   */
  async react(emoji: string | { name: string; id?: string; animated?: boolean }): Promise<void> {
    const emojiStr = await this.resolveEmojiForReaction(emoji);
    const route = `${Routes.channelMessageReaction(this.channelId, this.id, emojiStr)}/@me`;
    await this.client.rest.put(route);
  }

  /**
   * Remove the bot's reaction, or a specific user's reaction if userId is provided.
   * @param emoji - Unicode emoji, custom `{ name, id }`, `:name:`, `name:id`, or `<:name:id>`
   * @param userId - If provided, removes that user's reaction (requires moderator permissions)
   */
  async removeReaction(
    emoji: string | { name: string; id?: string; animated?: boolean },
    userId?: string,
  ): Promise<void> {
    const emojiStr = await this.resolveEmojiForReaction(emoji);
    const route = `${Routes.channelMessageReaction(this.channelId, this.id, emojiStr)}/${userId ?? '@me'}`;
    await this.client.rest.delete(route);
  }

  /**
   * Remove all reactions from this message.
   * Requires moderator permissions.
   */
  async removeAllReactions(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessageReactions(this.channelId, this.id));
  }

  /**
   * Remove all reactions of a specific emoji from this message.
   * @param emoji - Unicode emoji, custom `{ name, id }`, `:name:`, `name:id`, or `<:name:id>`. Requires moderator permissions.
   */
  async removeReactionEmoji(
    emoji: string | { name: string; id?: string; animated?: boolean },
  ): Promise<void> {
    const emojiStr = await this.resolveEmojiForReaction(emoji);
    await this.client.rest.delete(Routes.channelMessageReaction(this.channelId, this.id, emojiStr));
  }

  /**
   * Fetch users who reacted with the given emoji.
   * @param emoji - Unicode emoji or custom `{ name, id }`
   * @param options - limit (1–100), after (user ID for pagination)
   * @returns Array of User objects
   */
  async fetchReactionUsers(
    emoji: string | { name: string; id?: string; animated?: boolean },
    options?: { limit?: number; after?: string },
  ): Promise<User[]> {
    const emojiStr = await this.resolveEmojiForReaction(emoji);
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.after) params.set('after', options.after);
    const qs = params.toString();
    const route =
      Routes.channelMessageReaction(this.channelId, this.id, emojiStr) + (qs ? `?${qs}` : '');
    const data = await this.client.rest.get<
      | { users?: import('@fluxerjs/types').APIUserPartial[] }
      | import('@fluxerjs/types').APIUserPartial[]
    >(route);
    const list = Array.isArray(data) ? data : (data?.users ?? []);
    return list.map((u) => this.client.getOrCreateUser(u));
  }
}
