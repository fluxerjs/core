import type {
  GatewayVoiceStateUpdateDispatchData,
  GatewayVoiceStateAckDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStatesSyncData,
  GatewayEntranceSoundPlayDispatchData,
  GatewayUserConnectionsUpdateDispatchData,
  GatewayWebAuthnCredentialsUpdateDispatchData,
} from '@fluxerjs/types';

import { Events } from '../util/Events.js';

import type { Message } from '../structures/Message';

import type { PartialMessage } from '../structures/PartialMessage';

import type { Guild } from '../structures/Guild.js';

import type { Channel } from '../structures/Channel.js';

import type { GuildMember } from '../structures/GuildMember';

import type { GuildBan } from '../structures/GuildBan';

import type { Role } from '../structures/Role.js';

import type { Invite } from '../structures/Invite';

import type { User } from '../structures/User.js';

import type { Client } from './Client.js';

import type {
  AuditLogEntryPayload,
  ChannelMemberCountsUpdatePayload,
  ChannelPinsUpdatePayload,
  GuildCountsUpdatePayload,
  GuildEmojisUpdatePayload,
  GuildMembersChunkPayload,
  GuildRoleDeletePayload,
  GuildRoleUpdatePayload,
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
} from './eventPayloads.js';

/**

 * Callback parameter types for client events. Use with client.on(Events.X, handler).

 * @see Events

 */

export interface ClientEvents {
  [Events.Ready]: [];

  [Events.MessageCreate]: [message: Message];

  [Events.MessageUpdate]: [oldMessage: Message | null, newMessage: Message];

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

  [Events.GuildMemberRemove]: [member: GuildMember];

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

  [Events.GuildRoleUpdate]: [payload: GuildRoleUpdatePayload];

  [Events.GuildRoleDelete]: [payload: GuildRoleDeletePayload];

  [Events.ChannelPinsUpdate]: [payload: ChannelPinsUpdatePayload];

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
