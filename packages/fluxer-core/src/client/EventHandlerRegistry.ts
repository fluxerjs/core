import { Events } from '../util/Events.js';
import type {
  APIMessage,
  APIChannel,
  APIGuild,
  APIUser,
  APIUserPartial,
  APIGuildMember,
  APIApplicationCommandInteraction,
} from '@fluxerjs/types';
import type {
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData,
  GatewayMessageReactionRemoveEmojiDispatchData,
  GatewayMessageReactionRemoveAllDispatchData,
  GatewayVoiceStateUpdateDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayMessageDeleteBulkDispatchData,
  GatewayGuildBanAddDispatchData,
  GatewayGuildBanRemoveDispatchData,
  GatewayGuildRoleCreateDispatchData,
  GatewayGuildRoleUpdateDispatchData,
  GatewayGuildRoleDeleteDispatchData,
  GatewayTypingStartDispatchData,
  GatewayUserUpdateDispatchData,
} from '@fluxerjs/types';
import type { Client } from './Client.js';

export type DispatchHandler = (client: Client, data: unknown) => Promise<void>;

const handlers = new Map<string, DispatchHandler>();

handlers.set('MESSAGE_CREATE', async (client, d) => {
  const { Message } = await import('../structures/Message.js');
  client.emit(Events.MessageCreate, new Message(client, d as APIMessage));
});

handlers.set('MESSAGE_UPDATE', async (client, d) => {
  const { Message } = await import('../structures/Message.js');
  client.emit(Events.MessageUpdate, null, new Message(client, d as APIMessage));
});

handlers.set('MESSAGE_DELETE', async (client, d) => {
  const data = d as { id: string; channel_id: string };
  const channel = client.channels.get(data.channel_id) ?? null;
  client.emit(Events.MessageDelete, {
    id: data.id,
    channelId: data.channel_id,
    channel,
  });
});

handlers.set('MESSAGE_REACTION_ADD', async (client, d) => {
  const data = d as GatewayMessageReactionAddDispatchData;
  const { MessageReaction } = await import('../structures/MessageReaction.js');
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
  const { MessageReaction } = await import('../structures/MessageReaction.js');
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
  client.emit(Events.MessageReactionRemoveEmoji, d as GatewayMessageReactionRemoveEmojiDispatchData);
});

handlers.set('GUILD_CREATE', async (client, d) => {
  const { Guild } = await import('../structures/Guild.js');
  const { Channel } = await import('../structures/Channel.js');
  const guild = new Guild(client, d as APIGuild);
  client.guilds.set(guild.id, guild);
  const g = d as APIGuild & {
    channels?: APIChannel[];
    voice_states?: Array<{ user_id: string; channel_id: string | null }>;
  };
  for (const ch of g.channels ?? []) {
    const channel = Channel.from(client, ch);
    if (channel) client.channels.set(channel.id, channel);
  }
  client.emit(Events.GuildCreate, guild);
  if (g.voice_states?.length) {
    client.emit(Events.VoiceStatesSync, { guildId: guild.id, voiceStates: g.voice_states });
  }
});

handlers.set('GUILD_UPDATE', async (client, d) => {
  const { Guild } = await import('../structures/Guild.js');
  const g = d as APIGuild;
  const old = client.guilds.get(g.id);
  const updated = new Guild(client, g);
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
  const { Channel } = await import('../structures/Channel.js');
  const ch = Channel.from(client, d as APIChannel);
  if (ch) {
    client.channels.set(ch.id, ch);
    client.emit(
      Events.ChannelCreate,
      ch as import('../structures/Channel.js').GuildChannel
    );
  }
});

handlers.set('CHANNEL_UPDATE', async (client, d) => {
  const { Channel } = await import('../structures/Channel.js');
  const ch = d as APIChannel;
  const oldCh = client.channels.get(ch.id);
  const newCh = Channel.from(client, ch);
  if (newCh) {
    client.channels.set(newCh.id, newCh);
    client.emit(Events.ChannelUpdate, oldCh ?? newCh, newCh);
  }
});

handlers.set('CHANNEL_DELETE', async (client, d) => {
  const ch = d as { id: string };
  const channel = client.channels.get(ch.id);
  if (channel) {
    client.channels.delete(ch.id);
    client.emit(Events.ChannelDelete, channel);
  }
});

handlers.set('GUILD_MEMBER_ADD', async (client, d) => {
  const { GuildMember } = await import('../structures/GuildMember.js');
  const data = d as APIGuildMember & { guild_id: string };
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    const member = new GuildMember(client, data, guild);
    guild.members.set(member.id, member);
    client.emit(Events.GuildMemberAdd, member);
  }
});

handlers.set('GUILD_MEMBER_UPDATE', async (client, d) => {
  const { GuildMember } = await import('../structures/GuildMember.js');
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
  const data = d as { guild_id: string; user: APIUser };
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    const member = guild.members.get(data.user.id);
    if (member) {
      guild.members.delete(data.user.id);
      client.emit(Events.GuildMemberRemove, member);
    }
  }
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
  client.emit(Events.GuildBanAdd, d as GatewayGuildBanAddDispatchData);
});

handlers.set('GUILD_BAN_REMOVE', async (client, d) => {
  client.emit(Events.GuildBanRemove, d as GatewayGuildBanRemoveDispatchData);
});

handlers.set('GUILD_EMOJIS_UPDATE', async (client, d) => {
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
    const { Role } = await import('../structures/Role.js');
    guild.roles.set(data.role.id, new Role(client, data.role, guild.id));
  }
  client.emit(Events.GuildRoleCreate, data);
});

handlers.set('GUILD_ROLE_UPDATE', async (client, d) => {
  const data = d as GatewayGuildRoleUpdateDispatchData;
  const guild = client.guilds.get(data.guild_id);
  if (guild) {
    const { Role } = await import('../structures/Role.js');
    guild.roles.set(data.role.id, new Role(client, data.role, guild.id));
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
  client.emit(Events.InviteCreate, d);
});

handlers.set('INVITE_DELETE', async (client, d) => {
  client.emit(Events.InviteDelete, d);
});

handlers.set('TYPING_START', async (client, d) => {
  client.emit(Events.TypingStart, d as GatewayTypingStartDispatchData);
});

handlers.set('USER_UPDATE', async (client, d) => {
  const data = d as GatewayUserUpdateDispatchData;
  if (client.user?.id === data.id) {
    client.user._patch(data);
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
