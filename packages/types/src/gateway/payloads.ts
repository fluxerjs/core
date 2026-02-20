import { Snowflake } from '../common';
import {
  APIUser,
  APIChannel,
  APIGuild,
  APIMessage,
  APIGuildMember,
  APIInvite,
  APIRole,
  APIEmoji,
  APISticker,
} from '../api';
import { APIApplicationCommandInteraction } from '../api';
import { GatewayOpcodes } from './opcodes.js';
import { GatewayDispatchEventName } from './events.js';

// Outgoing (client -> gateway)
export interface GatewayIdentifyData {
  token: string;
  intents: number;
  properties: {
    os: string;
    browser: string;
    device: string;
  };
  compress?: boolean;
  large_threshold?: number;
  shard?: [shardId: number, numShards: number];
  presence?: GatewayPresenceUpdateData;
}

export interface GatewayResumeData {
  token: string;
  session_id: string;
  seq: number;
}

/** Custom status object (Fluxer uses this root object rather than Discord-style activities array). */
export interface GatewayCustomStatus {
  text?: string | null;
  emoji_name?: string | null;
  emoji_id?: string | null;
}

export interface GatewayPresenceUpdateData {
  since?: number | null;
  activities?: Array<{ name: string; type: number; url?: string | null }>;
  /** Custom status; set text (and optionally emoji) for bots. Passable on identify and via presence update. */
  custom_status?: GatewayCustomStatus | null;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  afk?: boolean;
}

export interface GatewayVoiceStateUpdateData {
  guild_id: Snowflake;
  channel_id: Snowflake | null;
  self_mute?: boolean;
  self_deaf?: boolean;
  /** Whether the user has video enabled (e.g. camera). */
  self_video?: boolean;
  /** Whether the user is screen sharing / streaming. */
  self_stream?: boolean;
  /** Connection ID from VoiceServerUpdate; required for updates when already in channel. */
  connection_id?: string | null;
}

export type GatewaySendPayload =
  | { op: GatewayOpcodes.Identify; d: GatewayIdentifyData }
  | { op: GatewayOpcodes.Resume; d: GatewayResumeData }
  | { op: GatewayOpcodes.Heartbeat; d: number | null }
  | { op: GatewayOpcodes.PresenceUpdate; d: GatewayPresenceUpdateData }
  | { op: GatewayOpcodes.VoiceStateUpdate; d: GatewayVoiceStateUpdateData }
  | {
      op: GatewayOpcodes.RequestGuildMembers;
      d: { guild_id: Snowflake; query?: string; limit: number };
    };

// Incoming (gateway -> client)
export interface GatewayHelloData {
  heartbeat_interval: number;
}

/** READY — v, user, guilds, session_id, shard?, application */
export interface GatewayReadyDispatchData {
  v: number;
  user: APIUser;
  guilds: Array<APIGuild & { unavailable?: boolean }>;
  session_id: string;
  shard?: [number, number];
  application: { id: Snowflake; flags: number };
}

/** MESSAGE_CREATE — full message with author, content, embeds, attachments, member? (guild). */
export type GatewayMessageCreateDispatchData = APIMessage;
/** MESSAGE_UPDATE — partial message (edited fields). */
export type GatewayMessageUpdateDispatchData = APIMessage;
/** MESSAGE_DELETE — id, channel_id, guild_id?, content?, author_id? (Fluxer may send content/author_id) */
export interface GatewayMessageDeleteDispatchData {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  content?: string | null;
  author_id?: Snowflake | null;
}

/** MESSAGE_DELETE_BULK — ids[], channel_id, guild_id? */
export interface GatewayMessageDeleteBulkDispatchData {
  ids: Snowflake[];
  channel_id: Snowflake;
  guild_id?: Snowflake;
}

/** Emoji data sent with reaction events (id is null for unicode emoji). */
export interface GatewayReactionEmoji {
  id?: Snowflake;
  name: string;
  animated?: boolean;
}

/** MESSAGE_REACTION_ADD — message_id, channel_id, user_id, guild_id?, emoji */
export interface GatewayMessageReactionAddDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  user_id: Snowflake;
  guild_id?: Snowflake;
  emoji: GatewayReactionEmoji;
}

/** MESSAGE_REACTION_REMOVE — message_id, channel_id, user_id, guild_id?, emoji */
export interface GatewayMessageReactionRemoveDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  user_id: Snowflake;
  guild_id?: Snowflake;
  emoji: GatewayReactionEmoji;
}

/** MESSAGE_REACTION_REMOVE_EMOJI — message_id, channel_id, guild_id?, emoji */
export interface GatewayMessageReactionRemoveEmojiDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  emoji: GatewayReactionEmoji;
}

/** MESSAGE_REACTION_REMOVE_ALL — message_id, channel_id, guild_id? */
export interface GatewayMessageReactionRemoveAllDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
}
/** MESSAGE_ACK — read receipt; message_id, channel_id */
export interface GatewayMessageAckDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
}

/** GUILD_CREATE — full guild with channels, members, roles, unavailable? */
export type GatewayGuildCreateDispatchData = APIGuild & { unavailable?: boolean };
/** GUILD_UPDATE — full guild object */
export type GatewayGuildUpdateDispatchData = APIGuild;
/** GUILD_DELETE — id, unavailable? (true = temp outage) */
export interface GatewayGuildDeleteDispatchData {
  id: Snowflake;
  unavailable?: boolean;
}

/** CHANNEL_CREATE — full channel */
export type GatewayChannelCreateDispatchData = APIChannel;
/** CHANNEL_UPDATE — full channel */
export type GatewayChannelUpdateDispatchData = APIChannel;
/** CHANNEL_UPDATE_BULK — channels[] */
export interface GatewayChannelUpdateBulkDispatchData {
  channels: APIChannel[];
}
/** CHANNEL_DELETE — full channel */
export type GatewayChannelDeleteDispatchData = APIChannel;
/** CHANNEL_RECIPIENT_ADD — channel_id, user (group DM) */
export interface GatewayChannelRecipientAddDispatchData {
  channel_id: Snowflake;
  user: APIUser;
}
/** CHANNEL_RECIPIENT_REMOVE — channel_id, user (group DM) */
export interface GatewayChannelRecipientRemoveDispatchData {
  channel_id: Snowflake;
  user: APIUser;
}

/** GUILD_MEMBER_ADD — member + guild_id */
export type GatewayGuildMemberAddDispatchData = APIGuildMember & { guild_id: Snowflake };
/** GUILD_MEMBER_UPDATE — guild_id, roles, user, nick?, avatar?, joined_at?, ... */
export interface GatewayGuildMemberUpdateDispatchData {
  guild_id: Snowflake;
  roles: Snowflake[];
  user: APIUser;
  nick?: string | null;
  avatar?: string | null;
  joined_at?: string;
  premium_since?: string | null;
  communication_disabled_until?: string | null;
}
/** GUILD_MEMBER_REMOVE — guild_id, user */
export interface GatewayGuildMemberRemoveDispatchData {
  guild_id: Snowflake;
  user: APIUser;
}
/** GUILD_MEMBERS_CHUNK — from request_guild_members; members[], chunk_index, chunk_count */
export interface GatewayGuildMembersChunkDispatchData {
  guild_id: Snowflake;
  members: Array<APIGuildMember & { guild_id?: Snowflake }>;
  chunk_index: number;
  chunk_count: number;
  presences?: Array<{ user: { id: Snowflake }; status?: string; activities?: unknown[] }>;
  nonce?: string | null;
}
/** GUILD_MEMBER_LIST_UPDATE — lazy member list; guild_id, id (list_id), member_count, online_count, groups, ops */
export interface GatewayGuildMemberListUpdateDispatchData {
  guild_id: Snowflake;
  id: string;
  member_count: number;
  online_count: number;
  groups: Array<{ id: string; count: number }>;
  ops: Array<{
    op: 'SYNC' | 'INVALIDATE';
    range?: [number, number];
    items?: Array<Record<string, unknown>>;
  }>;
}

/** GUILD_BAN_ADD — guild_id, user, reason? */
export interface GatewayGuildBanAddDispatchData {
  guild_id: Snowflake;
  user: APIUser;
  reason?: string | null;
}
/** GUILD_BAN_REMOVE — guild_id, user */
export interface GatewayGuildBanRemoveDispatchData {
  guild_id: Snowflake;
  user: APIUser;
}

/** INVITE_CREATE — full invite: code, guild, channel, inviter?, expires_at?, ... */
export type GatewayInviteCreateDispatchData = APIInvite;

/** INVITE_DELETE — code, channel_id, guild_id? */
export interface GatewayInviteDeleteDispatchData {
  code: string;
  channel_id: Snowflake;
  guild_id?: Snowflake;
}

/** TYPING_START — channel_id, user_id, timestamp, guild_id?, member? */
export interface GatewayTypingStartDispatchData {
  channel_id: Snowflake;
  user_id: Snowflake;
  timestamp: number;
  guild_id?: Snowflake;
  member?: APIGuildMember & { guild_id?: Snowflake };
}
/** USER_UPDATE — full current user (APIUser) */
export type GatewayUserUpdateDispatchData = APIUser;

/** GUILD_ROLE_CREATE — guild_id, role */
export interface GatewayGuildRoleCreateDispatchData {
  guild_id: Snowflake;
  role: APIRole;
}
/** GUILD_ROLE_UPDATE — guild_id, role */
export interface GatewayGuildRoleUpdateDispatchData {
  guild_id: Snowflake;
  role: APIRole;
}
/** GUILD_ROLE_DELETE — guild_id, role_id */
export interface GatewayGuildRoleDeleteDispatchData {
  guild_id: Snowflake;
  role_id: Snowflake;
}
/** GUILD_ROLE_UPDATE_BULK — guild_id, roles[] */
export interface GatewayGuildRoleUpdateBulkDispatchData {
  guild_id: Snowflake;
  roles: APIRole[];
}

/** VOICE_STATE_UPDATE — guild_id?, channel_id, user_id, member?, session_id, deaf?, mute?, ... */
export interface GatewayVoiceStateUpdateDispatchData {
  guild_id?: Snowflake;
  channel_id: Snowflake | null;
  user_id: Snowflake;
  member?: APIGuildMember & { guild_id?: Snowflake };
  session_id: string;
  /** Connection ID for voice session (Fluxer). */
  connection_id?: string | null;
  deaf?: boolean;
  mute?: boolean;
  self_deaf?: boolean;
  self_mute?: boolean;
  self_video?: boolean;
  /** Whether the user is screen sharing / streaming. */
  self_stream?: boolean;
  suppress?: boolean;
}

/** VOICE_SERVER_UPDATE — token, guild_id, endpoint, connection_id? */
export interface GatewayVoiceServerUpdateDispatchData {
  token: string;
  guild_id: Snowflake;
  endpoint: string | null;
  /** Connection ID for subsequent voice state updates (Fluxer). */
  connection_id?: string | null;
}

/** GUILD_EMOJIS_UPDATE — emoji list for a guild changed. */
export interface GatewayGuildEmojisUpdateDispatchData {
  guild_id: Snowflake;
  emojis: APIEmoji[];
}

/** GUILD_STICKERS_UPDATE — sticker list for a guild changed. */
export interface GatewayGuildStickersUpdateDispatchData {
  guild_id: Snowflake;
  stickers: APISticker[];
}

/** GUILD_INTEGRATIONS_UPDATE — integrations for a guild changed. */
export interface GatewayGuildIntegrationsUpdateDispatchData {
  guild_id: Snowflake;
}

/** GUILD_SCHEDULED_EVENT_CREATE — a scheduled event was created. */
export interface GatewayGuildScheduledEventCreateDispatchData {
  guild_id: Snowflake;
  id: Snowflake;
}

/** GUILD_SCHEDULED_EVENT_UPDATE — a scheduled event was updated. */
export interface GatewayGuildScheduledEventUpdateDispatchData {
  guild_id: Snowflake;
  id: Snowflake;
}

/** GUILD_SCHEDULED_EVENT_DELETE — a scheduled event was deleted. */
export interface GatewayGuildScheduledEventDeleteDispatchData {
  guild_id: Snowflake;
  id: Snowflake;
}

/** CHANNEL_PINS_UPDATE — pins in a channel changed. */
export interface GatewayChannelPinsUpdateDispatchData {
  guild_id?: Snowflake;
  channel_id: Snowflake;
  last_pin_timestamp?: string | null;
}
/** CHANNEL_PINS_ACK — user acknowledged viewing pinned messages */
export interface GatewayChannelPinsAckDispatchData {
  channel_id: Snowflake;
  last_pin_timestamp?: string | null;
}

/** PRESENCE_UPDATE — user presence (status, activities) changed. */
export interface GatewayPresenceUpdateDispatchData {
  user: { id: Snowflake };
  guild_id?: Snowflake;
  status?: string;
  activities?: Array<{ name: string; type: number; url?: string | null }>;
  /** Custom status (Fluxer). */
  custom_status?: GatewayCustomStatus | null;
}

/** WEBHOOKS_UPDATE — webhooks in a channel were updated. */
export interface GatewayWebhooksUpdateDispatchData {
  guild_id: Snowflake;
  channel_id: Snowflake;
}

// ─── Additional gateway events (session/user-scoped) ─────────────────────────

/** RESUMED — connection resumed; typically no payload. */
export type GatewayResumedDispatchData = undefined;

/** SESSIONS_REPLACE — user's active sessions list replaced */
export interface GatewaySessionsReplaceDispatchData {
  sessions?: Array<Record<string, unknown>>;
}

/** USER_SETTINGS_UPDATE — user settings (theme, locale, etc.) changed */
export type GatewayUserSettingsUpdateDispatchData = Record<string, unknown>;

/** USER_GUILD_SETTINGS_UPDATE — per-guild settings changed */
export type GatewayUserGuildSettingsUpdateDispatchData = Record<string, unknown>;

/** USER_PINNED_DMS_UPDATE — pinned DM order changed */
export type GatewayUserPinnedDmsUpdateDispatchData = Record<string, unknown>;

/** USER_NOTE_UPDATE — note on another user changed */
export interface GatewayUserNoteUpdateDispatchData {
  id: Snowflake;
  note?: string | null;
}

/** RECENT_MENTION_DELETE — recent mention cleared */
export type GatewayRecentMentionDeleteDispatchData = Record<string, unknown>;

/** SAVED_MESSAGE_CREATE — message saved (bookmarked) */
export type GatewaySavedMessageCreateDispatchData = APIMessage;

/** SAVED_MESSAGE_DELETE — saved message unsaved */
export interface GatewaySavedMessageDeleteDispatchData {
  id: Snowflake;
}

/** AUTH_SESSION_CHANGE — login/logout on another client */
export type GatewayAuthSessionChangeDispatchData = Record<string, unknown>;

/** PASSIVE_UPDATES — lazy-loaded entity updates */
export type GatewayPassiveUpdatesDispatchData = Record<string, unknown>;

/** GUILD_SYNC — guild sync state (passive/lazy) */
export type GatewayGuildSyncDispatchData = Record<string, unknown>;

/** RELATIONSHIP_ADD — relationship (friend, block) added */
export interface GatewayRelationshipAddDispatchData {
  id: Snowflake;
  type: number;
}

/** RELATIONSHIP_UPDATE — relationship updated */
export interface GatewayRelationshipUpdateDispatchData {
  id: Snowflake;
  type: number;
}

/** RELATIONSHIP_REMOVE — relationship removed */
export interface GatewayRelationshipRemoveDispatchData {
  id: Snowflake;
}

/** CALL_CREATE — call created */
export interface GatewayCallCreateDispatchData {
  id: Snowflake;
  channel_id: Snowflake;
  [key: string]: unknown;
}

/** CALL_UPDATE — call updated */
export interface GatewayCallUpdateDispatchData {
  id: Snowflake;
  channel_id: Snowflake;
  [key: string]: unknown;
}

/** CALL_DELETE — call ended */
export interface GatewayCallDeleteDispatchData {
  id: Snowflake;
  channel_id: Snowflake;
}

/** FAVORITE_MEME_CREATE — favorite meme/media added */
export type GatewayFavoriteMemeCreateDispatchData = Record<string, unknown>;

/** FAVORITE_MEME_UPDATE — favorite meme/media updated */
export type GatewayFavoriteMemeUpdateDispatchData = Record<string, unknown>;

/** FAVORITE_MEME_DELETE — favorite meme/media removed */
export type GatewayFavoriteMemeDeleteDispatchData = Record<string, unknown>;

/** INTERACTION_CREATE — slash command or component interaction */
export type GatewayInteractionCreateDispatchData = APIApplicationCommandInteraction;

export interface GatewayReceivePayload<T = unknown> {
  op: GatewayOpcodes;
  d?: T;
  s?: number;
  t?: GatewayDispatchEventName;
}
