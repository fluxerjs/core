import type { APIChannel, APIChannelPartial } from '@fluxerjs/types';
import { ChannelType } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import { DMChannel } from './Dm.js';
import {
  AnnouncementChannel,
  CategoryChannel,
  GuildChannel,
  LinkChannel,
  TextChannel,
  VoiceChannel,
} from './Guild.js';

type GuildFactory = (client: Client, data: APIChannel) => GuildChannel;

const GUILD_FACTORIES: Partial<Record<ChannelType, GuildFactory>> = {
  [ChannelType.GuildText]: (c, d) => new TextChannel(c, d),
  [ChannelType.GuildAnnouncement]: (c, d) => new AnnouncementChannel(c, d),
  [ChannelType.GuildCategory]: (c, d) => new CategoryChannel(c, d),
  [ChannelType.GuildVoice]: (c, d) => new VoiceChannel(c, d),
  [ChannelType.GuildLink]: (c, d) => new LinkChannel(c, d),
};

const DM_TYPES = new Set<ChannelType>([
  ChannelType.DM,
  ChannelType.GroupDM,
  ChannelType.DMPersonalNotes,
]);

export function createDM(client: Client, data: APIChannelPartial): DMChannel {
  return new DMChannel(client, data);
}

export function channelFrom(
  client: Client,
  data: APIChannel | APIChannelPartial,
): GuildChannel | TextChannel {
  const factory = GUILD_FACTORIES[(data.type ?? 0) as ChannelType];
  return factory
    ? factory(client, data as APIChannel)
    : new GuildChannel(client, data as APIChannel);
}

export function channelFromOrCreate(
  client: Client,
  data: APIChannel | APIChannelPartial,
): TextChannel | DMChannel | GuildChannel {
  return DM_TYPES.has(data.type ?? 0) ? createDM(client, data) : channelFrom(client, data);
}
