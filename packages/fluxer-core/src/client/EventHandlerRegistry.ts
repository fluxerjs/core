import { Events } from '../util/Events.js';
import {
  APIMessage,
  APIChannel,
  APIGuild,
  APIGuildMember,
  APIUserPartial,
  APIApplicationCommandInteraction,
  APIBan,
} from '@fluxerjs/types';
import {
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData,
  GatewayMessageReactionRemoveEmojiDispatchData,
  GatewayMessageReactionRemoveAllDispatchData,
  GatewayVoiceStateUpdateDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayMessageDeleteDispatchData,
  GatewayMessageDeleteBulkDispatchData,
  GatewayGuildBanAddDispatchData,
  GatewayGuildBanRemoveDispatchData,
  GatewayInviteCreateDispatchData,
  GatewayInviteDeleteDispatchData,
  GatewayGuildRoleCreateDispatchData,
  GatewayGuildRoleUpdateDispatchData,
  GatewayGuildRoleDeleteDispatchData,
  GatewayTypingStartDispatchData,
  GatewayUserUpdateDispatchData,
  GatewayGuildMemberRemoveDispatchData,
} from '@fluxerjs/types';
import { Client } from './Client.js';
import { normalizeGuildPayload } from '../util/guildUtils';
import { GuildMember } from '../structures/GuildMember';
import { Message } from '../structures/Message';
import { MessageReaction } from '../structures/MessageReaction';
import { Guild } from '../structures/Guild';
import { Channel, GuildChannel } from '../structures/Channel';
import { GuildBan } from '../structures/GuildBan';
import { Role } from '../structures/Role';
import { Invite } from '../structures/Invite';
import { GuildEmoji } from '../structures/GuildEmoji';

export type DispatchHandler = (client: Client, data: unknown) => Promise<void>;

const handlers = new Map<string, DispatchHandler>();

handlers.set('MESSAGE_CREATE', async (client, d) => {
  const data = d as APIMessage & { member?: APIGuildMember };
  if (data.guild_id && data.member && data.author) {
    const guild = client.guilds.get(data.guild_id);
    if (guild) {
      const memberData = { ...data.member, user: data.author, guild_id: data.guild_id };
      const member = new GuildMember(client, memberData, guild);
      guild.members.set(member.id, member);
    }
  }
  client.emit(Events.MessageCreate, new Message(client, data));
});

handlers.set('MESSAGE_UPDATE', async (client, d) => {
  client.emit(Events.MessageUpdate, null, new Message(client, d as APIMessage));
});

handlers.set('MESSAGE_DELETE', async (client, d) => {
  const data = d as GatewayMessageDeleteDispatchData;
  const channel = client.channels.get(data.channel_id) ?? null;
  client.emit(Events.MessageDelete, {
    id: data.id,
    channelId: data.channel_id,
    channel,
    content: data.content ?? null,
    authorId: data.author_id ?? null,
  });
});

handlers.set('MESSAGE_REACTION_ADD', async (client, d) => {
  const data = d as GatewayMessageReactionAddDispatchData;
  const reaction = new MessageReaction(client, data);
  const user = client.getOrCreateUser({
    id: data.user_id,
    username: 'Unknown',
    discriminator: '0',
  } as APIUserPartial);
  client.emit(Events.MessageReactionAdd, reaction, user);
});

handlers.set('MESSAGE_REACTION_REMOVE', async (client, d) => {
  const data = d as GatewayMessageReactionRemoveDispatchData;
  const reaction = new MessageReaction(client, data);
  const user = client.getOrCreateUser({
    id: data.user_id,
    username: 'Unknown',
    discriminator: '0',
  } as APIUserPartial);
  client.emit(Events.MessageReactionRemove, reaction, user);
});

handlers.set('MESSAGE_REACTION_REMOVE_ALL', async (client, d) => {
  client.emit(Events.MessageReactionRemoveAll, d as GatewayMessageReactionRemoveAllDispatchData);
});

handlers.set('MESSAGE_REACTION_REMOVE_EMOJI', async (client, d) => {
  client.emit(
    Events.MessageReactionRemoveEmoji,
    d as GatewayMessageReactionRemoveEmojiDispatchData,
  );
});

handlers.set('GUILD_CREATE', async (client, d) => {
  const guildData = normalizeGuildPayload(d as unknown);
  if (!guildData) return;
  const guild = new Guild(client, guildData);
  client.guilds.set(guild.id, guild);
  const g = d as APIGuild & {
    channels?: APIChannel[];
    voice_states?: Array<{ user_id: string; channel_id: string | null }>;
    members?: Array<APIGuildMember & { user: { id: string }; guild_id?: string }>;
  };
  for (const ch of g.channels ?? []) {
    const channel = Channel.from(client, ch);
    if (channel) {
      client.channels.set(channel.id, channel);
      guild.channels.set(channel.id, channel as GuildChannel);
    }
  }
  for (const m of g.members ?? []) {
    if (m?.user?.id) {
      const memberData = { ...m, guild_id: guild.id };
      const member = new GuildMember(client, memberData, guild);
      guild.members.set(member.id, member);
    }
  }
  client.emit(Events.GuildCreate, guild);
  if (g.voice_states?.length) {
    client.emit(Events.VoiceStatesSync, { guildId: guild.id, voiceStates: g.voice_states });
  }
});

handlers.set('GUILD_UPDATE', async (client, d) => {
  const guildData = normalizeGuildPayload(d as unknown);
  if (!guildData) return;
  const old = client.guilds.get(guildData.id);
  const updated = new Guild(client, guildData);
  client.guilds.set(updated.id, updated);
  client.emit(Events.GuildUpdate, old ?? updated, updated);
});

handlers.set('GUILD_DELETE', async (client, d) => {
  const g = d as { id: string };
  const guild = client.guilds.get(g.id);
  if (guild) {
    client.guilds.delete(g.id);
    client.emit(Events.GuildDelete, guild);
  }
});

handlers.set('CHANNEL_CREATE', async (client, d) => {
  const ch = Channel.from(client, d as APIChannel);
  if (ch) {
    client.channels.set(ch.id, ch);
    if ('guildId' in ch && ch.guildId) {
      const guild = client.guilds.get(ch.guildId);
      if (guild) guild.channels.set(ch.id, ch as GuildChannel);
    }
    client.emit(Events.ChannelCreate, ch as GuildChannel);
  }
});

handlers.set('CHANNEL_UPDATE', async (client, d) => {
  const ch = d as APIChannel;
  const oldCh = client.channels.get(ch.id);
  const newCh = Channel.from(client, ch);
  if (newCh) {
    client.channels.set(newCh.id, newCh);
    if ('guildId' in newCh && newCh.guildId) {
      const guild = client.guilds.get(newCh.guildId);
      if (guild) guild.channels.set(newCh.id, newCh as GuildChannel);
    }
    client.emit(Events.ChannelUpdate, oldCh ?? newCh, newCh);
  }
});

handlers.set('CHANNEL_DELETE', async (client, d) => {
  const ch = d as { id: string; guild_id?: string };
  const channel = client.channels.get(ch.id);
  if (channel) {
    if ('guildId' in channel && channel.guildId) {
      const guild = client.guilds.get(channel.guildId);
      if (guild) guild.channels.delete(channel.id);
    }
    client.channels.delete(ch.id);
    client.emit(Events.ChannelDelete, channel);
  }
});

handlers.set('GUILD_MEMBER_ADD', async (client, d) => {
  const data = d as APIGuildMember & { guild_id: string };
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    const member = new GuildMember(client, data, guild);
    guild.members.set(member.id, member);
    client.emit(Events.GuildMemberAdd, member);
  }
});

handlers.set('GUILD_MEMBER_UPDATE', async (client, d) => {
  const data = d as APIGuildMember & { guild_id: string };
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    const oldM = guild.members.get(data.user.id);
    const newM = new GuildMember(client, data, guild);
    guild.members.set(newM.id, newM);
    client.emit(Events.GuildMemberUpdate, oldM ?? newM, newM);
  }
});

handlers.set('GUILD_MEMBER_REMOVE', async (client, d) => {
  const data = d as GatewayGuildMemberRemoveDispatchData;
  const guild = client.guilds.get(data.guild_id);
  if (!guild || !data.user?.id) return;

  let member = guild.members.get(data.user.id);
  if (member) {
    guild.members.delete(data.user.id);
  } else {
    // Member was never cached (e.g. joined before bot cached guild). Build partial from payload
    // so leave handlers run for all leaves, not only cached members.
    const user: APIUserPartial = {
      ...data.user,
      id: data.user.id,
      username: data.user.username ?? 'Unknown',
      discriminator: data.user.discriminator ?? '0',
    };
    const memberData: APIGuildMember & { guild_id?: string } = {
      user,
      roles: [],
      joined_at: new Date(0).toISOString(),
      nick: null,
    };
    member = new GuildMember(client, memberData, guild);
  }
  client.emit(Events.GuildMemberRemove, member);
});

handlers.set('INTERACTION_CREATE', async (client, d) => {
  client.emit(Events.InteractionCreate, d as APIApplicationCommandInteraction);
});

handlers.set('VOICE_STATE_UPDATE', async (client, d) => {
  client.emit(Events.VoiceStateUpdate, d as GatewayVoiceStateUpdateDispatchData);
});

handlers.set('VOICE_SERVER_UPDATE', async (client, d) => {
  client.emit(Events.VoiceServerUpdate, d as GatewayVoiceServerUpdateDispatchData);
});

handlers.set('MESSAGE_DELETE_BULK', async (client, d) => {
  client.emit(Events.MessageDeleteBulk, d as GatewayMessageDeleteBulkDispatchData);
});

handlers.set('GUILD_BAN_ADD', async (client, d) => {
  const data = d as GatewayGuildBanAddDispatchData;
  const banData: APIBan & { guild_id?: string } = {
    user: data.user,
    reason: data.reason ?? null,
    guild_id: data.guild_id,
  };
  const ban = new GuildBan(client, banData, data.guild_id);
  client.emit(Events.GuildBanAdd, ban);
});

handlers.set('GUILD_BAN_REMOVE', async (client, d) => {
  const data = d as GatewayGuildBanRemoveDispatchData;
  const ban = new GuildBan(client, { ...data, reason: null }, data.guild_id);
  client.emit(Events.GuildBanRemove, ban);
});

handlers.set('GUILD_EMOJIS_UPDATE', async (client, d) => {
  const data = d as {
    guild_id: string;
    emojis: Array<{ id: string; name?: string; animated?: boolean }>;
  };
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    guild.emojis.clear();
    for (const e of data.emojis ?? []) {
      if (!e.id || e.name == null) continue;
      guild.emojis.set(
        e.id,
        new GuildEmoji(
          client,
          { id: e.id, name: e.name, animated: e.animated ?? false, guild_id: guild.id },
          guild.id,
        ),
      );
    }
  }
  client.emit(Events.GuildEmojisUpdate, d);
});

handlers.set('GUILD_STICKERS_UPDATE', async (client, d) => {
  client.emit(Events.GuildStickersUpdate, d);
});

handlers.set('GUILD_INTEGRATIONS_UPDATE', async (client, d) => {
  client.emit(Events.GuildIntegrationsUpdate, d);
});

handlers.set('GUILD_ROLE_CREATE', async (client, d) => {
  const data = d as GatewayGuildRoleCreateDispatchData;
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    guild.roles.set(data.role.id, new Role(client, data.role, guild.id));
  }
  client.emit(Events.GuildRoleCreate, data);
});

handlers.set('GUILD_ROLE_UPDATE', async (client, d) => {
  const data = d as GatewayGuildRoleUpdateDispatchData;
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    const existing = guild.roles.get(data.role.id);
    if (existing) {
      existing._patch(data.role);
    } else {
      guild.roles.set(data.role.id, new Role(client, data.role, guild.id));
    }
  }
  client.emit(Events.GuildRoleUpdate, data);
});

handlers.set('GUILD_ROLE_DELETE', async (client, d) => {
  const data = d as GatewayGuildRoleDeleteDispatchData;
  const guild = client.guilds.get(data.guild_id);
  if (guild) guild.roles.delete(data.role_id);
  client.emit(Events.GuildRoleDelete, data);
});

handlers.set('GUILD_SCHEDULED_EVENT_CREATE', async (client, d) => {
  client.emit(Events.GuildScheduledEventCreate, d);
});

handlers.set('GUILD_SCHEDULED_EVENT_UPDATE', async (client, d) => {
  client.emit(Events.GuildScheduledEventUpdate, d);
});

handlers.set('GUILD_SCHEDULED_EVENT_DELETE', async (client, d) => {
  client.emit(Events.GuildScheduledEventDelete, d);
});

handlers.set('CHANNEL_PINS_UPDATE', async (client, d) => {
  client.emit(Events.ChannelPinsUpdate, d);
});

handlers.set('INVITE_CREATE', async (client, d) => {
  const data = d as GatewayInviteCreateDispatchData;
  client.emit(Events.InviteCreate, new Invite(client, data));
});

handlers.set('INVITE_DELETE', async (client, d) => {
  client.emit(Events.InviteDelete, d as GatewayInviteDeleteDispatchData);
});

handlers.set('TYPING_START', async (client, d) => {
  client.emit(Events.TypingStart, d as GatewayTypingStartDispatchData);
});

handlers.set('USER_UPDATE', async (client, d) => {
  const data = d as GatewayUserUpdateDispatchData;
  if (client.user?.id === data.id) {
    client.user!._patch(data);
  }
  client.emit(Events.UserUpdate, data);
});

handlers.set('PRESENCE_UPDATE', async (client, d) => {
  client.emit(Events.PresenceUpdate, d);
});

handlers.set('WEBHOOKS_UPDATE', async (client, d) => {
  client.emit(Events.WebhooksUpdate, d);
});

handlers.set('RESUMED', async (client) => {
  client.emit(Events.Resumed);
});

/** Registry of gateway dispatch event handlers. Add handlers via set() for extensibility. */
export const eventHandlers = handlers;
