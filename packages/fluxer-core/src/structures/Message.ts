import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type { APIMessage, APIMessageAttachment, APIEmbed } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { User } from './User.js';
import type { Channel } from './Channel.js';

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

  async reply(options: string | { content?: string; embeds?: APIEmbed[] }): Promise<Message> {
    const body = typeof options === 'string'
      ? { content: options, message_reference: { channel_id: this.channelId, message_id: this.id, guild_id: this.guildId ?? undefined } }
      : { ...options, message_reference: { channel_id: this.channelId, message_id: this.id, guild_id: this.guildId ?? undefined } };
    const data = await this.client.rest.post(Routes.channelMessages(this.channelId), { body });
    return new Message(this.client, data as APIMessage);
  }

  async edit(options: { content?: string }): Promise<Message> {
    const data = await this.client.rest.patch(Routes.channelMessage(this.channelId, this.id), { body: options });
    return new Message(this.client, data as APIMessage);
  }

  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessage(this.channelId, this.id));
  }
}
