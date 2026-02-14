import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { APIChannel, APIChannelPartial } from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';

export abstract class Channel extends Base {
  readonly client: Client;
  readonly id: string;
  type: ChannelType;

  constructor(client: Client, data: APIChannelPartial) {
    super();
    this.client = client;
    this.id = data.id;
    this.type = data.type;
  }

  static from(client: Client, data: APIChannel | APIChannelPartial): GuildChannel | TextChannel | null {
    const type = data.type ?? 0;
    if (type === ChannelType.GuildText) return new TextChannel(client, data as APIChannel);
    if (type === ChannelType.GuildCategory) return new CategoryChannel(client, data as APIChannel);
    if (type === ChannelType.GuildVoice) return new VoiceChannel(client, data as APIChannel);
    if (type === ChannelType.GuildLink) return new LinkChannel(client, data as APIChannel);
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
