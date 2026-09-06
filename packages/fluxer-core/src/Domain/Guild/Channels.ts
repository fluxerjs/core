import type { APIChannel, APIInvite, APIWebhook } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import {
  type GuildChannelCreateOptions,
  toChannelCreateBody,
  toChannelPositionBody,
} from '../../ClientCore/SdkOptions/index.js';
import type { GuildChannel } from '../Channel/index.js';
import { Invite } from '../Invite.js';
import { Webhook } from '../Webhook.js';
import { cacheChannel } from './Cache.js';
import type { Guild } from './Guild.js';
import type { ChannelPositionUpdate } from './Types.js';

export async function createChannel(
  guild: Guild,
  options: GuildChannelCreateOptions,
): Promise<GuildChannel> {
  const created = await guild.client.rest.post(Routes.guildChannels(guild.id), {
    body: toChannelCreateBody(options),
    auth: true,
  });
  return cacheChannel(guild, created as APIChannel) as GuildChannel;
}

export async function fetchChannels(guild: Guild): Promise<GuildChannel[]> {
  const data = await guild.client.rest.get<APIChannel[]>(Routes.guildChannels(guild.id));
  const channels: GuildChannel[] = [];
  for (const ch of data) {
    const channel = cacheChannel(guild, ch);
    if (channel) channels.push(channel);
  }
  return channels;
}

export async function setChannelPositions(
  guild: Guild,
  updates: ChannelPositionUpdate[],
): Promise<void> {
  await guild.client.rest.patch(Routes.guildChannels(guild.id), {
    body: toChannelPositionBody(updates),
    auth: true,
  });
}

export async function fetchWebhooks(guild: Guild): Promise<Webhook[]> {
  const data = await guild.client.rest.get<APIWebhook[]>(Routes.guildWebhooks(guild.id));
  return data.map((w) => new Webhook(guild.client, w));
}

export async function fetchInvites(guild: Guild): Promise<Invite[]> {
  const data = await guild.client.rest.get<APIInvite[]>(Routes.guildInvites(guild.id));
  return data.map((invite) => new Invite(guild.client, invite));
}

export async function fetchInvite(guild: Guild, codeOrUrl: string): Promise<Invite> {
  return Invite.fetch(guild.client, codeOrUrl);
}
