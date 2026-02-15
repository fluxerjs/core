import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type { APIMessage, APIMessageAttachment, APIEmbed } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { EmbedBuilder } from '@fluxerjs/builders';
import { User } from './User.js';
import type { Channel } from './Channel.js';

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
  channel?: Channel;

  /** @param data - API message from POST/PATCH /channels/{id}/messages or gateway MESSAGE_CREATE */
  constructor(client: Client, data: APIMessage) {
    super();
    this.client = client;
    this.id = data.id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.author = new User(client, data.author);
    this.content = data.content;
    this.createdAt = new Date(data.timestamp);
    this.editedAt = data.edited_timestamp ? new Date(data.edited_timestamp) : null;
    this.pinned = data.pinned;
    this.attachments = new Collection();
    for (const a of data.attachments ?? []) this.attachments.set(a.id, a);
  }

  /**
   * Reply to this message.
   * @param options - Text content or object with content and/or embeds
   */
  async reply(options: string | { content?: string; embeds?: APIEmbed[] }): Promise<Message> {
    const body = typeof options === 'string'
      ? { content: options, message_reference: { channel_id: this.channelId, message_id: this.id, guild_id: this.guildId ?? undefined } }
      : { ...options, message_reference: { channel_id: this.channelId, message_id: this.id, guild_id: this.guildId ?? undefined } };
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
    const data = await this.client.rest.patch(Routes.channelMessage(this.channelId, this.id), { body });
    return new Message(this.client, data as APIMessage);
  }

  /** Delete this message. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessage(this.channelId, this.id));
  }

  /**
   * Format emoji for reaction API: unicode string or "name:id" for custom.
   * @param emoji - Unicode emoji (e.g. "👍") or custom { name, id } or "name:id" string
   */
  private static formatEmoji(emoji: string | { name: string; id: string }): string {
    if (typeof emoji === 'string') return emoji;
    return `${emoji.name}:${emoji.id}`;
  }

  /**
   * Add a reaction to this message (as the bot).
   * @param emoji - Unicode emoji (e.g. `👍`) or custom emoji `{ name, id }`
   */
  async react(emoji: string | { name: string; id: string }): Promise<void> {
    const emojiStr = Message.formatEmoji(emoji);
    const route = `${Routes.channelMessageReaction(this.channelId, this.id, emojiStr)}/@me`;
    await this.client.rest.put(route);
  }

  /**
   * Remove the bot's reaction, or a specific user's reaction if userId is provided.
   * @param emoji - Unicode emoji or custom `{ name, id }`
   * @param userId - If provided, removes that user's reaction (requires moderator permissions)
   */
  async removeReaction(emoji: string | { name: string; id: string }, userId?: string): Promise<void> {
    const emojiStr = Message.formatEmoji(emoji);
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
   * @param emoji - Unicode emoji or custom `{ name, id }`. Requires moderator permissions.
   */
  async removeReactionEmoji(emoji: string | { name: string; id: string }): Promise<void> {
    const emojiStr = Message.formatEmoji(emoji);
    await this.client.rest.delete(Routes.channelMessageReaction(this.channelId, this.id, emojiStr));
  }
}
