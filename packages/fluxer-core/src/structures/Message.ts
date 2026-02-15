import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type { APIMessage, APIMessageAttachment, APIEmbed } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { EmbedBuilder } from '@fluxerjs/builders';
import type { User } from './User.js';
import type { Channel } from './Channel.js';
import type { Guild } from './Guild.js';

/** Options for editing a message (content and/or embeds). */
export interface MessageEditOptions {
  /** New text content */
  content?: string;
  /** New embeds (replaces existing) */
  embeds?: (APIEmbed | EmbedBuilder)[];
}

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

  /** Channel where this message was sent. Resolved from cache; null if not cached (e.g. DM channel not in cache). */
  get channel(): Channel | null {
    return this.client.channels.get(this.channelId) ?? null;
  }

  /** Guild where this message was sent. Resolved from cache; null for DMs or if not cached. */
  get guild(): Guild | null {
    return this.guildId ? (this.client.guilds.get(this.guildId) ?? null) : null;
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
  }

  /**
   * Send a message to this channel without replying. Use when you want a standalone message.
   * @param options - Text content or object with content and/or embeds
   * @example
   * await message.send('Pong!');
   * await message.send({ embeds: [embed.toJSON()] });
   */
  async send(options: string | { content?: string; embeds?: APIEmbed[] }): Promise<Message> {
    const body = typeof options === 'string' ? { content: options } : options;
    const data = await this.client.rest.post(Routes.channelMessages(this.channelId), { body });
    return new Message(this.client, data as APIMessage);
  }

  /**
   * Send a message to a specific channel. Use for logging, forwarding, or sending to another channel in the guild.
   * @param channelId - Snowflake of the target channel (e.g. log channel ID)
   * @param options - Text content or object with content and/or embeds
   * @example
   * await message.sendTo(logChannelId, 'User ' + message.author.username + ' said: ' + message.content);
   * await message.sendTo(announceChannelId, { embeds: [embed.toJSON()] });
   */
  async sendTo(
    channelId: string,
    options: string | { content?: string; embeds?: APIEmbed[] }
  ): Promise<Message> {
    return this.client.channels.send(channelId, options);
  }

  /**
   * Reply to this message.
   * @param options - Text content or object with content and/or embeds
   */
  async reply(options: string | { content?: string; embeds?: APIEmbed[] }): Promise<Message> {
    const body =
      typeof options === 'string'
        ? {
            content: options,
            message_reference: {
              channel_id: this.channelId,
              message_id: this.id,
              guild_id: this.guildId ?? undefined,
            },
          }
        : {
            ...options,
            message_reference: {
              channel_id: this.channelId,
              message_id: this.id,
              guild_id: this.guildId ?? undefined,
            },
          };
    const data = await this.client.rest.post(Routes.channelMessages(this.channelId), { body });
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
   * Re-fetch this message from the API to get the latest content, embeds, reactions, etc.
   * Use when you have a stale Message (e.g. from an old event or cache) and need fresh data.
   * @returns The updated message, or null if deleted or not found
   * @example
   * const updated = await message.fetch();
   * if (updated) console.log('Latest content:', updated.content);
   */
  async fetch(): Promise<Message | null> {
    return this.client.channels.fetchMessage(this.channelId, this.id);
  }

  /** Delete this message. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessage(this.channelId, this.id));
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
    emoji: string | { name: string; id?: string; animated?: boolean }
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
    userId?: string
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
    emoji: string | { name: string; id?: string; animated?: boolean }
  ): Promise<void> {
    const emojiStr = await this.resolveEmojiForReaction(emoji);
    await this.client.rest.delete(Routes.channelMessageReaction(this.channelId, this.id, emojiStr));
  }
}
