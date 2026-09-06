import type {
  GatewayEntranceSoundPlayDispatchData,
  GatewayUserConnectionsUpdateDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateAckDispatchData,
  GatewayVoiceStatesSyncData,
  GatewayVoiceStateUpdateDispatchData,
  GatewayWebAuthnCredentialsUpdateDispatchData,
} from '@fluxerjs/types';
import type { Channel } from '../Domain/Channel/index.js';
import type { Guild } from '../Domain/Guild/Guild.js';
import type { GuildBan } from '../Domain/Guild/GuildBan.js';
import type { GuildMember } from '../Domain/Guild/GuildMember.js';
import type { PartialGuildMember } from '../Domain/Guild/PartialGuildMember.js';
import type { Role } from '../Domain/Guild/Role.js';
import type { Invite } from '../Domain/Invite.js';
import type { Message } from '../Domain/Message/index.js';
import type { PartialMessage } from '../Domain/Message/PartialMessage.js';
import type { User } from '../Domain/User.js';
import { Events } from '../Helpers/Events.js';
import type { Client } from './Client.js';
import type {
  AuditLogEntryPayload,
  ChannelMemberCountsUpdatePayload,
  ChannelPinsUpdatePayload,
  ChannelRecipientPayload,
  GuildCountsUpdatePayload,
  GuildEmojisUpdatePayload,
  GuildMembersChunkPayload,
  GuildStickersUpdatePayload,
  InviteDeletePayload,
  MessageDeleteBulkPayload,
  MessageReactionAddManyPayload,
  MessageReactionPayload,
  MessageReactionRemoveAllPayload,
  MessageReactionRemoveEmojiPayload,
  PresenceUpdateBulkPayload,
  PresenceUpdatePayload,
  TypingStartPayload,
  WebhooksUpdatePayload,
} from './EventPayloads.js';

/**
 * Callback parameter types for client events. Use with client.on(Events.X, handler).
 * @see Events
 */
export interface ClientEvents {
  [Events.Ready]: [];
  [Events.MessageCreate]: [message: Message];
  [Events.MessageUpdate]: [oldMessage: Message | null, newMessage: Message | PartialMessage];
  [Events.MessageDelete]: [message: PartialMessage];
  [Events.MessageReactionAdd]: [payload: MessageReactionPayload];
  [Events.MessageReactionAddMany]: [payload: MessageReactionAddManyPayload];
  [Events.MessageReactionRemove]: [payload: MessageReactionPayload];
  [Events.MessageReactionRemoveAll]: [payload: MessageReactionRemoveAllPayload];
  [Events.MessageReactionRemoveEmoji]: [payload: MessageReactionRemoveEmojiPayload];
  [Events.GuildCreate]: [guild: Guild];
  [Events.GuildAvailable]: [guild: Guild];
  [Events.GuildUnavailable]: [guild: Guild];
  [Events.GuildUpdate]: [oldGuild: Guild, newGuild: Guild];
  [Events.GuildDelete]: [guild: Guild];
  /** Emitted when any channel type is created. */
  [Events.ChannelCreate]: [channel: Channel];
  [Events.ChannelUpdate]: [oldChannel: Channel, newChannel: Channel];
  [Events.ChannelDelete]: [channel: Channel];
  [Events.GuildMemberAdd]: [member: GuildMember];
  [Events.GuildMemberUpdate]: [oldMember: GuildMember | null, newMember: GuildMember];
  [Events.GuildMemberRemove]: [member: GuildMember | PartialGuildMember];
  [Events.GuildMembersChunk]: [payload: GuildMembersChunkPayload];
  [Events.GuildCountsUpdate]: [payload: GuildCountsUpdatePayload];
  [Events.ChannelMemberCountsUpdate]: [payload: ChannelMemberCountsUpdatePayload];
  [Events.GuildAuditLogEntryCreate]: [payload: AuditLogEntryPayload];
  /** Voice events stay wire-shaped (frozen voice package compatibility). */
  [Events.VoiceStateUpdate]: [data: GatewayVoiceStateUpdateDispatchData];
  [Events.VoiceStateAck]: [data: GatewayVoiceStateAckDispatchData];
  [Events.VoiceServerUpdate]: [data: GatewayVoiceServerUpdateDispatchData];
  [Events.EntranceSoundPlay]: [data: GatewayEntranceSoundPlayDispatchData];
  [Events.VoiceStatesSync]: [data: GatewayVoiceStatesSyncData];
  [Events.MessageDeleteBulk]: [payload: MessageDeleteBulkPayload];
  [Events.GuildBanAdd]: [ban: GuildBan];
  [Events.GuildBanRemove]: [ban: GuildBan];
  [Events.GuildEmojisUpdate]: [payload: GuildEmojisUpdatePayload];
  [Events.GuildStickersUpdate]: [payload: GuildStickersUpdatePayload];
  [Events.GuildRoleCreate]: [role: Role];
  /** `oldRole` is null when the role was not cached before the update. */
  [Events.GuildRoleUpdate]: [oldRole: Role | null, role: Role];
  /** `role` is null when the role was not cached before delete. */
  [Events.GuildRoleDelete]: [role: Role | null, guildId: string, roleId: string];
  [Events.ChannelPinsUpdate]: [payload: ChannelPinsUpdatePayload];
  [Events.ChannelRecipientAdd]: [payload: ChannelRecipientPayload];
  [Events.ChannelRecipientRemove]: [payload: ChannelRecipientPayload];
  [Events.InviteCreate]: [invite: Invite];
  [Events.InviteDelete]: [payload: InviteDeletePayload];
  [Events.TypingStart]: [payload: TypingStartPayload];
  [Events.UserUpdate]: [user: User];
  [Events.UserConnectionsUpdate]: [data: GatewayUserConnectionsUpdateDispatchData];
  [Events.WebAuthnCredentialsUpdate]: [data: GatewayWebAuthnCredentialsUpdateDispatchData];
  [Events.PresenceUpdate]: [payload: PresenceUpdatePayload];
  [Events.PresenceUpdateBulk]: [payload: PresenceUpdateBulkPayload];
  [Events.WebhooksUpdate]: [payload: WebhooksUpdatePayload];
  [Events.Resumed]: [];
  [Events.Error]: [error: Error];
  [Events.Debug]: [message: string];
  /** A single gateway shard completed READY. */
  [Events.ShardReady]: [shardId: number];
  /** A single gateway shard successfully resumed. */
  [Events.ShardResumed]: [shardId: number];
  /** A gateway shard closed. */
  [Events.ShardDisconnect]: [shardId: number, code: number];
  /** A gateway shard is reconnecting. */
  [Events.ShardReconnecting]: [shardId: number];
  /** A gateway shard emitted an error. */
  [Events.ShardError]: [shardId: number, error: Error];
  /**
   * The gateway closed with 4011 — this bot needs more shards.
   * Non-zero shards drop guild-less events; DMs only reach shard 0.
   */
  [Events.ShardingRequired]: [payload: { shardId: number; numShards: number }];
}

export type ClientEventName = keyof ClientEvents;

export type ClientEventListener<K extends ClientEventName> = (...args: ClientEvents[K]) => void;

/** Typed event handler methods. */
export type ClientEventMethods = {
  [K in keyof typeof Events]: (cb: (...args: ClientEvents[(typeof Events)[K]]) => void) => Client;
};

export function createEventMethods(client: Client): ClientEventMethods {
  const result: Record<string, (cb: (...args: unknown[]) => void) => Client> = {};
  for (const key of Object.keys(Events) as (keyof typeof Events)[]) {
    const eventName = Events[key];
    result[key] = (cb) => {
      client.on(eventName, cb as (...args: unknown[]) => void);
      return client;
    };
  }
  return result as ClientEventMethods;
}
