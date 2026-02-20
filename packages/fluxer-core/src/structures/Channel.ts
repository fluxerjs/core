import { Client } from '../client/Client.js';
import { MessageManager } from '../client/MessageManager.js';
import { MessageCollector } from '../util/MessageCollector.js';
import { MessageCollectorOptions } from '../util/MessageCollector.js';
import { Base } from './Base.js';
import { buildSendBody, resolveMessageFiles } from '../util/messageUtils.js';
import { MessageSendOptions } from '../util/messageUtils.js';
import {
  APIChannel,
  APIChannelPartial,
  APIChannelOverwrite,
  APIUser,
  APIMessage, APIWebhook, APIInvite,
} from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';
import { emitDeprecationWarning } from '@fluxerjs/util';
import { User } from './User.js';
import { Webhook } from './Webhook.js';
import { Message } from './Message';
import { Invite } from './Invite';

/** Base class for all channel types. */
export abstract class Channel extends Base {
  /** Whether this channel has a send method (TextChannel, DMChannel). */
  isSendable(): this is TextChannel | DMChannel {
    return 'send' in this;
  }

  /** Whether this channel is a DM or Group DM. */
  isDM(): boolean {
    return this.type === ChannelType.DM || this.type === ChannelType.GroupDM;
  }

  /** Whether this channel is voice-based (VoiceChannel). */
  isVoice(): boolean {
    return 'bitrate' in this;
  }

  /** Create a DM channel from API data (type DM or GroupDM). */
  static createDM(client: Client, data: APIChannelPartial): DMChannel {
    return new DMChannel(client, data);
  }
  readonly client: Client;
  readonly id: string;
  type: ChannelType;
  /** Channel name. Guild channels and Group DMs have names; 1:1 DMs are typically null. */
  name: string | null;
  /** Channel icon hash (Group DMs). Null if none. */
  icon: string | null;
  /** ISO timestamp when the last message was pinned. Null if never pinned. */
  lastPinTimestamp: string | null;

  /** @param data - API channel from GET /channels/{id} or GET /guilds/{id}/channels */
  constructor(client: Client, data: APIChannelPartial) {
    super();
    this.client = client;
    this.id = data.id;
    this.type = data.type;
    this.name = data.name ?? null;
    this.icon = data.icon ?? null;
    this.lastPinTimestamp = (data as APIChannel).last_pin_timestamp ?? null;
  }

  /**
   * Create the appropriate channel subclass from API data.
   * @param client - The client instance
   * @param data - Channel data from the API
   */
  static from(
    client: Client,
    data: APIChannel | APIChannelPartial,
  ): GuildChannel | TextChannel | null {
    const type = data.type ?? 0;
    if (type === ChannelType.GuildText) return new TextChannel(client, data as APIChannel);
    if (type === ChannelType.GuildCategory) return new CategoryChannel(client, data as APIChannel);
    if (type === ChannelType.GuildVoice) return new VoiceChannel(client, data as APIChannel);
    if (type === ChannelType.GuildLink || type === ChannelType.GuildLinkExtended)
      return new LinkChannel(client, data as APIChannel);
    return new GuildChannel(client, data as APIChannel);
  }

  /**
   * Create a channel from API data, including DM and GroupDM.
   * Used by ChannelManager.fetch() for GET /channels/{id}.
   */
  static fromOrCreate(
    client: Client,
    data: APIChannel | APIChannelPartial,
  ): TextChannel | DMChannel | GuildChannel | null {
    const type = data.type ?? 0;
    if (type === ChannelType.DM || type === ChannelType.GroupDM)
      return Channel.createDM(client, data);
    return Channel.from(client, data);
  }

  /**
   * Bulk delete messages. Requires Manage Messages permission.
   * @param messageIds - Array of message IDs to delete (2–100)
   */
  async bulkDeleteMessages(messageIds: string[]): Promise<void> {
    await this.client.rest.post(Routes.channelBulkDelete(this.id), {
      body: { message_ids: messageIds },
      auth: true,
    });
  }

  /**
   * Send a typing indicator to the channel. Lasts ~10 seconds.
   */
  async sendTyping(): Promise<void> {
    await this.client.rest.post(Routes.channelTyping(this.id), { auth: true });
  }
}

export class GuildChannel extends Channel {
  readonly guildId: string;
  name: string | null;
  position?: number;
  parentId: string | null;
  /** Permission overwrites for roles and members. */
  permissionOverwrites: APIChannelOverwrite[];

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id ?? '';
    this.name = data.name ?? null;
    this.position = data.position;
    this.parentId = data.parent_id ?? null;
    this.permissionOverwrites = data.permission_overwrites ?? [];
  }

  /**
   * Create a webhook in this channel.
   * @param options - Webhook name and optional avatar URL
   * @returns The webhook with token (required for send()). Requires Manage Webhooks permission.
   */
  async createWebhook(options: { name: string; avatar?: string | null }): Promise<Webhook> {
    const data = await this.client.rest.post(Routes.channelWebhooks(this.id), {
      body: options,
      auth: true,
    });
    return new Webhook(this.client, data as APIWebhook);
  }

  /**
   * Fetch all webhooks in this channel.
   * @returns Webhooks (includes token when listing from channel; can send via send())
   */
  async fetchWebhooks(): Promise<Webhook[]> {
    const data = await this.client.rest.get(Routes.channelWebhooks(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    return list.map((w) => new Webhook(this.client, w));
  }

  /**
   * Create an invite for this channel.
   * @param options - max_uses (0–100), max_age (0–604800 seconds), unique, temporary
   * Requires Create Instant Invite permission.
   */
  async createInvite(options?: {
    max_uses?: number;
    max_age?: number;
    unique?: boolean;
    temporary?: boolean;
  }): Promise<Invite> {
    const body: Record<string, unknown> = {};
    if (options?.max_uses != null) body.max_uses = options.max_uses;
    if (options?.max_age != null) body.max_age = options.max_age;
    if (options?.unique != null) body.unique = options.unique;
    if (options?.temporary != null) body.temporary = options.temporary;
    const data = await this.client.rest.post(Routes.channelInvites(this.id), {
      body: Object.keys(body).length ? body : undefined,
      auth: true,
    });
    return new Invite(this.client, data as APIInvite);
  }

  /**
   * Fetch invites for this channel.
   * Requires Manage Channel permission.
   */
  async fetchInvites(): Promise<Invite[]> {
    const data = await this.client.rest.get(Routes.channelInvites(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    return list.map((i) => new Invite(this.client, i as APIInvite));
  }

  /**
   * Set or update a permission overwrite. PUT /channels/{id}/permissions/{overwriteId}.
   * @param overwriteId - Role or member ID
   * @param options - type (0=role, 1=member), allow, deny (permission bitfields)
   */
  async editPermission(
    overwriteId: string,
    options: { type: 0 | 1; allow?: string; deny?: string },
  ): Promise<void> {
    await this.client.rest.put(Routes.channelPermission(this.id, overwriteId), {
      body: options,
      auth: true,
    });
    const idx = this.permissionOverwrites.findIndex((o) => o.id === overwriteId);
    const entry = {
      id: overwriteId,
      type: options.type,
      allow: options.allow ?? '0',
      deny: options.deny ?? '0',
    };
    if (idx >= 0) this.permissionOverwrites[idx] = entry;
    else this.permissionOverwrites.push(entry);
  }

  /**
   * Remove a permission overwrite. DELETE /channels/{id}/permissions/{overwriteId}.
   */
  async deletePermission(overwriteId: string): Promise<void> {
    await this.client.rest.delete(Routes.channelPermission(this.id, overwriteId), { auth: true });
    const idx = this.permissionOverwrites.findIndex((o) => o.id === overwriteId);
    if (idx >= 0) this.permissionOverwrites.splice(idx, 1);
  }

  /**
   * Edit this channel. PATCH /channels/{id}.
   * Requires Manage Channel permission.
   */
  async edit(options: {
    name?: string | null;
    topic?: string | null;
    parent_id?: string | null;
    bitrate?: number | null;
    user_limit?: number | null;
    nsfw?: boolean;
    rate_limit_per_user?: number;
    rtc_region?: string | null;
    permission_overwrites?: Array<{ id: string; type: number; allow?: string; deny?: string }>;
  }): Promise<this> {
    const data = await this.client.rest.patch<APIChannel>(Routes.channel(this.id), {
      body: options,
      auth: true,
    });
    this.name = data.name ?? this.name;
    this.parentId = data.parent_id ?? this.parentId;
    this.permissionOverwrites = data.permission_overwrites ?? this.permissionOverwrites;
    const self = this as Record<string, unknown>;
    if ('topic' in self && 'topic' in data) self.topic = data.topic ?? null;
    if ('nsfw' in self && 'nsfw' in data) self.nsfw = data.nsfw ?? false;
    if ('rate_limit_per_user' in data) self.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    if ('bitrate' in self && 'bitrate' in data) self.bitrate = data.bitrate ?? null;
    if ('user_limit' in data) self.userLimit = data.user_limit ?? null;
    if ('rtc_region' in data) self.rtcRegion = data.rtc_region ?? null;
    return this;
  }

  /**
   * Delete this channel. Requires Manage Channel permission.
   * @param options - silent: if true, does not send a system message (default false)
   */
  async delete(options?: { silent?: boolean }): Promise<void> {
    const url = Routes.channel(this.id) + (options?.silent ? '?silent=true' : '');
    await this.client.rest.delete(url, { auth: true });
    this.client.channels.delete(this.id);
    const guild = this.client.guilds.get(this.guildId);
    if (guild) guild.channels.delete(this.id);
  }
}

export class TextChannel extends GuildChannel {
  topic?: string | null;
  nsfw?: boolean;
  rateLimitPerUser?: number;
  lastMessageId?: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.topic = data.topic ?? null;
    this.nsfw = data.nsfw ?? false;
    this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    this.lastMessageId = data.last_message_id ?? null;
  }

  /**
   * Send a message to this channel.
   * @param options - Text content or object with content, embeds, and/or files
   */
  async send(options: MessageSendOptions): Promise<Message> {
    const opts = typeof options === 'string' ? { content: options } : options;
    const body = buildSendBody(options);
    const files = opts.files?.length ? await resolveMessageFiles(opts.files) : undefined;
    const postOptions = files?.length ? { body, files } : { body };
    const data = await this.client.rest.post(Routes.channelMessages(this.id), postOptions);
    return new Message(this.client, data as APIMessage);
  }

  /** Message manager for this channel. Use channel.messages.fetch(messageId). */
  get messages(): MessageManager {
    return new MessageManager(this.client, this.id);
  }

  /**
   * Create a message collector for this channel.
   * Collects messages matching the filter until time expires or max is reached.
   * @param options - Filter, time (ms), and max count
   * @example
   * const collector = channel.createMessageCollector({ filter: m => m.author.id === userId, time: 10000 });
   * collector.on('collect', m => console.log(m.content));
   * collector.on('end', (collected, reason) => { ... });
   */
  createMessageCollector(options?: MessageCollectorOptions): MessageCollector {
    return new MessageCollector(this.client, this.id, options);
  }

  /**
   * Fetch pinned messages in this channel.
   * @returns Pinned messages
   */
  async fetchPinnedMessages(): Promise<Message[]> {
    type PinnedItem = APIMessage | { message?: APIMessage };
    const data = (await this.client.rest.get(Routes.channelPins(this.id))) as
      | { items?: PinnedItem[] }
      | APIMessage[];
    const list: PinnedItem[] = Array.isArray(data) ? data : (data?.items ?? []);
    return list.map((item) => {
      const msg = typeof item === 'object' && item && 'message' in item ? item.message : item;
      return new Message(this.client, msg as APIMessage);
    });
  }

  /**
   * Fetch a message by ID from this channel.
   * @param messageId - Snowflake of the message
   * @returns The message, or null if not found
   * @deprecated Use channel.messages.fetch(messageId) instead.
   */
  async fetchMessage(messageId: string): Promise<Message> {
    emitDeprecationWarning(
      'Channel.fetchMessage()',
      'Use channel.messages.fetch(messageId) instead.',
    );
    return this.client.channels.fetchMessage(this.id, messageId);
  }
}

export class CategoryChannel extends GuildChannel {}
export class VoiceChannel extends GuildChannel {
  bitrate?: number | null;
  userLimit?: number | null;
  rtcRegion?: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.bitrate = data.bitrate ?? null;
    this.userLimit = data.user_limit ?? null;
    this.rtcRegion = data.rtc_region ?? null;
  }
}

export class LinkChannel extends GuildChannel {
  url?: string | null;
  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.url = data.url ?? null;
  }
}

/** DM channel (direct message between bot and a user). */
export class DMChannel extends Channel {
  lastMessageId?: string | null;
  /** Group DM creator ID. Null for 1:1 DMs. */
  ownerId: string | null;
  /** Group DM recipients as User objects. Empty for 1:1 DMs. */
  recipients: User[];
  /** Group DM member display names (userId -> nickname). */
  nicks: Record<string, string>;

  constructor(client: Client, data: APIChannelPartial & Partial<APIChannel>) {
    super(client, data);
    this.lastMessageId = (data as APIChannel).last_message_id ?? null;
    this.ownerId = (data as APIChannel).owner_id ?? null;
    this.recipients = ((data as APIChannel).recipients ?? []).map((u: APIUser) =>
      client.getOrCreateUser(u),
    );
    this.nicks = (data as APIChannel).nicks ?? {};
  }

  /**
   * Send a message to this DM channel.
   * @param options - Text content or object with content, embeds, and/or files
   */
  async send(options: MessageSendOptions): Promise<Message> {
    const opts = typeof options === 'string' ? { content: options } : options;
    const body = buildSendBody(options);
    const files = opts.files?.length ? await resolveMessageFiles(opts.files) : undefined;
    const postOptions = files?.length ? { body, files } : { body };
    const data = await this.client.rest.post(Routes.channelMessages(this.id), postOptions);
    return new Message(this.client, data as APIMessage);
  }

  /** Message manager for this channel. Use channel.messages.fetch(messageId). */
  get messages(): MessageManager {
    return new MessageManager(this.client, this.id);
  }

  /**
   * Create a message collector for this DM channel.
   * @param options - Filter, time (ms), and max count
   */
  createMessageCollector(options?: MessageCollectorOptions): MessageCollector {
    return new MessageCollector(this.client, this.id, options);
  }

  /**
   * Fetch pinned messages in this DM channel.
   * @returns Pinned messages
   */
  async fetchPinnedMessages(): Promise<Message[]> {
    type PinnedItem = APIMessage | { message?: APIMessage };
    const data = (await this.client.rest.get(Routes.channelPins(this.id))) as
      | { items?: PinnedItem[] }
      | APIMessage[];
    const list: PinnedItem[] = Array.isArray(data) ? data : (data?.items ?? []);
    return list.map((item) => {
      const msg = typeof item === 'object' && item && 'message' in item ? item.message : item;
      return new Message(this.client, msg as APIMessage);
    });
  }

  /**
   * Fetch a message by ID from this DM channel.
   * @param messageId - Snowflake of the message
   * @returns The message, or null if not found
   * @deprecated Use channel.messages.fetch(messageId) instead.
   */
  async fetchMessage(messageId: string): Promise<Message> {
    emitDeprecationWarning(
      'Channel.fetchMessage()',
      'Use channel.messages.fetch(messageId) instead.',
    );
    return this.client.channels.fetchMessage(this.id, messageId);
  }

  /**
   * Add a recipient to this Group DM. Requires Group DM (type GroupDM).
   * PUT /channels/{id}/recipients/{userId}.
   */
  async addRecipient(userId: string): Promise<void> {
    await this.client.rest.put(Routes.channelRecipient(this.id, userId), { auth: true });
    const user = this.client.users.get(userId) ?? (await this.client.users.fetch(userId));
    if (user) this.recipients.push(user);
  }

  /**
   * Remove a recipient from this Group DM. Requires Group DM (type GroupDM).
   * DELETE /channels/{id}/recipients/{userId}.
   * @param options - silent: if true, does not send a system message (default false)
   */
  async removeRecipient(userId: string, options?: { silent?: boolean }): Promise<void> {
    const url = Routes.channelRecipient(this.id, userId) + (options?.silent ? '?silent=true' : '');
    await this.client.rest.delete(url, { auth: true });
    const idx = this.recipients.findIndex((u) => u.id === userId);
    if (idx >= 0) this.recipients.splice(idx, 1);
  }
}
