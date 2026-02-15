import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { APIChannel, APIChannelPartial } from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';
import type { Webhook } from './Webhook.js';

/** Base class for all channel types. */
export abstract class Channel extends Base {
  /** Create a DM channel from API data (type DM or GroupDM). */
  static createDM(client: Client, data: APIChannelPartial): DMChannel {
    return new DMChannel(client, data);
  }
  readonly client: Client;
  readonly id: string;
  type: ChannelType;

  /** @param data - API channel from GET /channels/{id} or GET /guilds/{id}/channels */
  constructor(client: Client, data: APIChannelPartial) {
    super();
    this.client = client;
    this.id = data.id;
    this.type = data.type;
  }

  /**
   * Create the appropriate channel subclass from API data.
   * @param client - The client instance
   * @param data - Channel data from the API
   */
  static from(client: Client, data: APIChannel | APIChannelPartial): GuildChannel | TextChannel | null {
    const type = data.type ?? 0;
    if (type === ChannelType.GuildText) return new TextChannel(client, data as APIChannel);
    if (type === ChannelType.GuildCategory) return new CategoryChannel(client, data as APIChannel);
    if (type === ChannelType.GuildVoice) return new VoiceChannel(client, data as APIChannel);
    if (type === ChannelType.GuildLink || type === ChannelType.GuildLinkExtended) return new LinkChannel(client, data as APIChannel);
    return new GuildChannel(client, data as APIChannel);
  }
}

export class GuildChannel extends Channel {
  readonly guildId: string;
  name: string | null;
  position?: number;
  parentId: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id ?? '';
    this.name = data.name ?? null;
    this.position = data.position;
    this.parentId = data.parent_id ?? null;
  }

  /**
   * Create a webhook in this channel.
   * @param options - Webhook name and optional avatar URL
   * @returns The webhook with token (required for send()). Requires Manage Webhooks permission.
   */
  async createWebhook(options: { name: string; avatar?: string | null }): Promise<Webhook> {
    const { Webhook } = await import('./Webhook.js');
    const data = await this.client.rest.post(Routes.channelWebhooks(this.id), {
      body: options,
      auth: true,
    });
    return new Webhook(this.client, data as import('@fluxerjs/types').APIWebhook);
  }

  /**
   * Fetch all webhooks in this channel.
   * @returns Webhooks (includes token when listing from channel; can send via send())
   */
  async fetchWebhooks(): Promise<Webhook[]> {
    const { Webhook } = await import('./Webhook.js');
    const data = await this.client.rest.get(Routes.channelWebhooks(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    return list.map((w) => new Webhook(this.client, w));
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
   * @param options - Text content or object with `content` and/or `embeds`
   */
  async send(options: string | { content?: string; embeds?: unknown[] }): Promise<import('./Message.js').Message> {
    const body = typeof options === 'string' ? { content: options } : options;
    const { Message } = await import('./Message.js');
    const data = await this.client.rest.post(Routes.channelMessages(this.id), { body });
    return new Message(this.client, data as import('@fluxerjs/types').APIMessage);
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

  constructor(client: Client, data: APIChannelPartial) {
    super(client, data);
    this.lastMessageId = (data as APIChannel & { last_message_id?: string | null }).last_message_id ?? null;
  }

  /**
   * Send a message to this DM channel.
   * @param options - Text content or object with `content` and/or `embeds`
   */
  async send(options: string | { content?: string; embeds?: unknown[] }): Promise<import('./Message.js').Message> {
    const body = typeof options === 'string' ? { content: options } : options;
    const { Message } = await import('./Message.js');
    const data = await this.client.rest.post(Routes.channelMessages(this.id), { body });
    return new Message(this.client, data as import('@fluxerjs/types').APIMessage);
  }
}
