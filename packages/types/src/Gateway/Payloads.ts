import type {
  APIChannel,
  APIEmoji,
  APIGuild,
  APIGuildAuditLogEntry,
  APIGuildMember,
  APIInvite,
  APIMessage,
  APIRole,
  APISticker,
  APIUser,
  APIUserConnectionsUpdate,
  APIVoiceState,
  APIWebAuthnCredential,
  GatewayReactionMemberSnapshot,
  RelationshipType,
} from '../Api';
import type { Snowflake } from '../Common';
import type { GatewayDispatchEventName } from './Events.js';
import type { GatewayOpcodes } from './Opcodes.js';

// ─── Outgoing (client -> gateway) ────────────────────────────────────────────

/** Identify flags (Fluxer `GatewayIdentifyFlags`). Sent as `flags` on IDENTIFY. */
export const GatewayIdentifyFlags = {
  DebounceMessageReactions: 1 << 1,
} as const;

/** Identify payload (opcode 2) — initial handshake. */
export interface GatewayIdentifyData {
  /** Bot or user token. */
  token: string;
  /** Client properties. */
  properties: {
    os: string;
    browser: string;
    device: string;
  };
  /**
   * Legacy Discord-style intents bitfield. Fluxer ignores this; prefer {@link flags}.
   * @deprecated Fluxer has no gateway intents — omit or send `0`.
   */
  intents?: number;
  /** {@link GatewayIdentifyFlags} bitfield. */
  flags?: number;
  /** Dispatch event names to suppress for this session. */
  ignored_events?: string[];
  /** Prefer hydrating this guild first after READY. */
  initial_guild_id?: Snowflake;
  /** Whether to use zlib compression. */
  compress?: boolean;
  /** Threshold for large guild offline member fetching. */
  large_threshold?: number;
  /** Shard info [shard_id, num_shards]. */
  shard?: [shardId: number, numShards: number];
  /** Initial presence. */
  presence?: GatewayPresenceUpdateData;
}

/** Resume payload (opcode 6) — reconnect with existing session. */
export interface GatewayResumeData {
  /** Bot or user token. */
  token: string;
  /** Session ID from READY. */
  session_id: string;
  /** Last received sequence number. */
  seq: number;
}

/** Custom status object (Fluxer uses this root object rather than Discord-style activities array). */
export interface GatewayCustomStatus {
  /** Status text. */
  text?: string | null;
  /** Unicode emoji name. */
  emoji_name?: string | null;
  /** Custom emoji ID. */
  emoji_id?: string | null;
}

/** Presence update payload (opcode 3) — update status/activity. */
export interface GatewayPresenceUpdateData {
  /** Unix timestamp when the client went idle (null if active). */
  since?: number | null;
  /** Activities array (for compatibility; Fluxer also supports custom_status). */
  activities?: Array<{
    name: string;
    /** Activity type integer (no closed OpenAPI enum yet). */
    type: number;
    url?: string | null;
  }>;
  /** Custom status; set text (and optionally emoji) for bots. Passable on identify and via presence update. */
  custom_status?: GatewayCustomStatus | null;
  /** Status (online, idle, dnd, invisible). */
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  /** Whether the client is AFK. */
  afk?: boolean;
}

/** Voice state update payload (opcode 4) — join/leave/mute/deaf. */
export interface GatewayVoiceStateUpdateData {
  /** Guild ID. */
  guild_id: Snowflake;
  /** Channel ID (null to disconnect). */
  channel_id: Snowflake | null;
  /** Whether self-muted. */
  self_mute?: boolean;
  /** Whether self-deafened. */
  self_deaf?: boolean;
  /** Whether the user has video enabled (e.g. camera). */
  self_video?: boolean;
  /** Whether the user is screen sharing / streaming. */
  self_stream?: boolean;
  /** Connection ID from VoiceServerUpdate; required for updates when already in channel. */
  connection_id?: string | null;
}

/** Client request for guild member/online counts (opcode 15). */
export interface GatewayRequestGuildCountsData {
  /** Guild IDs to fetch counts for. */
  guild_ids: Snowflake[];
  /** Optional nonce for matching response. */
  nonce?: string;
}

/** Client request for per-channel member counts (opcode 16). */
export interface GatewayRequestChannelMemberCountsData {
  /** Guild ID. */
  guild_id: Snowflake;
  /** Single channel ID. */
  channel_id?: Snowflake;
  /** Multiple channel IDs. */
  channel_ids?: Snowflake[];
  /** Optional nonce for matching response. */
  nonce?: string;
}

/** Client request for guild members (opcode 8). */
export interface GatewayRequestGuildMembersData {
  /** Single guild ID. */
  guild_id?: Snowflake;
  /** Multiple guild IDs. */
  guild_ids?: Snowflake[];
  /** Username prefix query (empty string = all, when not using user_ids). */
  query?: string;
  /** Max members to return (0 = no limit when using user_ids). */
  limit?: number;
  /** Specific user IDs to fetch. */
  user_ids?: Snowflake[];
  /** Whether to include presences in the chunk. */
  presences?: boolean;
  /** Optional nonce echoed in GUILD_MEMBERS_CHUNK. */
  nonce?: string;
}

/** Union of all client-to-gateway payloads. */
export type GatewaySendPayload =
  | { op: GatewayOpcodes.Identify; d: GatewayIdentifyData }
  | { op: GatewayOpcodes.Resume; d: GatewayResumeData }
  | { op: GatewayOpcodes.Heartbeat; d: number | null }
  | { op: GatewayOpcodes.PresenceUpdate; d: GatewayPresenceUpdateData }
  | { op: GatewayOpcodes.VoiceStateUpdate; d: GatewayVoiceStateUpdateData }
  | {
      op: GatewayOpcodes.RequestGuildMembers;
      d: GatewayRequestGuildMembersData;
    }
  | { op: GatewayOpcodes.RequestGuildCounts; d: GatewayRequestGuildCountsData }
  | { op: GatewayOpcodes.RequestChannelMemberCounts; d: GatewayRequestChannelMemberCountsData };

// ─── Incoming (gateway -> client) ────────────────────────────────────────────

/** Hello payload (opcode 10) — server hello with heartbeat interval. */
export interface GatewayHelloData {
  /** Milliseconds between heartbeats. */
  heartbeat_interval: number;
}

/**
 * Guild snapshot in READY / GUILD_CREATE.
 * Fluxer nests guild metadata under `properties`; flat guild objects are also accepted.
 */
export type GatewayGuildSnapshot =
  | (APIGuild & {
      unavailable?: boolean;
      channels?: APIChannel[];
      roles?: APIRole[];
      members?: APIGuildMember[];
      emojis?: APIEmoji[];
      stickers?: APISticker[];
      voice_states?: APIVoiceState[];
      member_count?: number;
      online_count?: number;
      joined_at?: string;
    })
  | {
      id: Snowflake;
      properties: APIGuild;
      unavailable?: boolean;
      channels?: APIChannel[];
      roles?: APIRole[];
      members?: APIGuildMember[];
      emojis?: APIEmoji[];
      stickers?: APISticker[];
      voice_states?: APIVoiceState[];
      member_count?: number;
      online_count?: number;
      joined_at?: string;
    };

/** READY dispatch (op 0, t = READY) — initial connection established. */
export interface GatewayReadyDispatchData {
  /** Current user object. */
  user: APIUser;
  /**
   * Guilds for this session.
   * Bot tokens typically receive `[]` here; full snapshots arrive via GUILD_CREATE.
   */
  guilds: GatewayGuildSnapshot[];
  /** Session ID for resuming. */
  session_id: string;
  /** Private / DM channels (user clients; usually absent for bots). */
  private_channels?: APIChannel[];
  /** Shard info [shard_id, num_shards] when sharding. */
  shard?: [number, number];
}

/** MESSAGE_CREATE dispatch — new message. */
export type GatewayMessageCreateDispatchData = APIMessage;

/** MESSAGE_UPDATE dispatch — message edited. */
export type GatewayMessageUpdateDispatchData = APIMessage;

/** MESSAGE_DELETE dispatch — message deleted. Fluxer may include content/author_id for caching. */
export interface GatewayMessageDeleteDispatchData {
  /** Message ID. */
  id: Snowflake;
  /** Channel ID. */
  channel_id: Snowflake;
  /** Guild ID (if guild message). */
  guild_id?: Snowflake;
  /** Message content (Fluxer extension for caching). */
  content?: string | null;
  /** Author ID (Fluxer extension for caching). */
  author_id?: Snowflake | null;
}

/** MESSAGE_DELETE_BULK dispatch — multiple messages deleted. */
export interface GatewayMessageDeleteBulkDispatchData {
  /** Message IDs. */
  ids: Snowflake[];
  /** Channel ID. */
  channel_id: Snowflake;
  /** Guild ID (if guild messages). */
  guild_id?: Snowflake;
}

/** Emoji data sent with reaction events (id is null for unicode emoji). */
export interface GatewayReactionEmoji {
  /** Emoji ID (null for Unicode emoji). */
  id?: Snowflake;
  /** Emoji name (Unicode char or custom emoji name). */
  name: string;
  /** Whether the emoji is animated. */
  animated?: boolean;
}

/** MESSAGE_REACTION_ADD dispatch — reaction added. */
export interface GatewayMessageReactionAddDispatchData {
  /** Message ID. */
  message_id: Snowflake;
  /** Channel ID. */
  channel_id: Snowflake;
  /** User who added the reaction. */
  user_id: Snowflake;
  /** Guild ID (if guild message). */
  guild_id?: Snowflake;
  /** Member snapshot (if guild message). */
  member?: APIGuildMember;
  /** Emoji used. */
  emoji: GatewayReactionEmoji;
}

/** Single reaction in MESSAGE_REACTION_ADD_MANY. */
export interface GatewayMessageReactionAddManyEntry {
  /** User who added the reaction. */
  user_id: Snowflake;
  /** Emoji used. */
  emoji: GatewayReactionEmoji;
  /** Member snapshot (if guild message). */
  member?: GatewayReactionMemberSnapshot;
}

/** MESSAGE_REACTION_ADD_MANY dispatch — batch reaction adds. */
export interface GatewayMessageReactionAddManyDispatchData {
  /** Channel ID. */
  channel_id: Snowflake;
  /** Message ID. */
  message_id: Snowflake;
  /** Guild ID (if guild message). */
  guild_id?: Snowflake;
  /** Reactions added. */
  reactions: GatewayMessageReactionAddManyEntry[];
}

/** MESSAGE_REACTION_REMOVE dispatch — reaction removed. */
export interface GatewayMessageReactionRemoveDispatchData {
  /** Message ID. */
  message_id: Snowflake;
  /** Channel ID. */
  channel_id: Snowflake;
  /** User who removed the reaction. */
  user_id: Snowflake;
  /** Guild ID (if guild message). */
  guild_id?: Snowflake;
  /** Member snapshot (if guild message). */
  member?: APIGuildMember;
  /** Emoji removed. */
  emoji: GatewayReactionEmoji;
}

/** MESSAGE_REACTION_REMOVE_EMOJI dispatch — all reactions of one emoji removed. */
export interface GatewayMessageReactionRemoveEmojiDispatchData {
  /** Message ID. */
  message_id: Snowflake;
  /** Channel ID. */
  channel_id: Snowflake;
  /** Guild ID (if guild message). */
  guild_id?: Snowflake;
  /** Emoji removed. */
  emoji: GatewayReactionEmoji;
}

/** MESSAGE_REACTION_REMOVE_ALL dispatch — all reactions removed. */
export interface GatewayMessageReactionRemoveAllDispatchData {
  /** Message ID. */
  message_id: Snowflake;
  /** Channel ID. */
  channel_id: Snowflake;
  /** Guild ID (if guild message). */
  guild_id?: Snowflake;
}

/** MESSAGE_ACK dispatch — message acknowledged (read receipt). */
export interface GatewayMessageAckDispatchData {
  /** Message ID. */
  message_id: Snowflake;
  /** Channel ID. */
  channel_id: Snowflake;
}

/** GUILD_CREATE — full guild snapshot (nested `properties` or flat). */
export type GatewayGuildCreateDispatchData = GatewayGuildSnapshot;
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
    op: 'SYNC' | 'INVALIDATE' | 'INSERT' | 'UPDATE' | 'DELETE';
    range?: [number, number];
    index?: number;
    item?: GatewayGuildMemberListItem;
    items?: GatewayGuildMemberListItem[];
  }>;
}

/** Item payload used by GUILD_MEMBER_LIST_UPDATE op entries. */
export interface GatewayGuildMemberListItem {
  group?: { id: string; count?: number };
  member?: APIGuildMember & { guild_id?: Snowflake };
  user?: APIUser;
  [key: string]: unknown;
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

/**
 * INVITE_CREATE — invite payload from gateway.
 * May be partial; some instances send guild_id/channel_id without nested guild/channel objects.
 */
export type GatewayInviteCreateDispatchData = Partial<APIInvite> & {
  guild_id?: Snowflake;
  channel_id?: Snowflake;
};

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

/** VOICE_STATE_UPDATE — full voice state (matches APIVoiceState / VoiceStateResponse). */
export type GatewayVoiceStateUpdateDispatchData = APIVoiceState & {
  member?: APIGuildMember & { guild_id?: Snowflake };
};

/** Internal sync payload emitted from READY/GUILD_CREATE voice_states (not a gateway dispatch). */
export interface GatewayVoiceStatesSyncData {
  guildId: Snowflake;
  voiceStates: APIVoiceState[];
}

/** VOICE_SERVER_UPDATE — token, guild_id, endpoint, connection_id? */
export interface GatewayVoiceServerUpdateDispatchData {
  token: string;
  guild_id: Snowflake;
  endpoint: string | null;
  /** Connection ID for subsequent voice state updates (Fluxer). */
  connection_id?: string | null;
}

/** VOICE_STATE_ACK — acknowledgement for a voice state mutation. */
export interface GatewayVoiceStateAckDispatchData {
  mutation_id?: string;
  runtime_epoch?: string | null;
  connection_id?: string | null;
  guild_id?: Snowflake | null;
  channel_id?: Snowflake | null;
  status?: string;
  server_version?: number;
  canonical_state?: GatewayVoiceStateUpdateDispatchData | null;
  error_code?: string;
  error_message?: string;
}

/** ENTRANCE_SOUND_PLAY — entrance sound played when a user joins voice. */
export interface GatewayEntranceSoundPlayDispatchData {
  user_id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake | null;
  sound_id: Snowflake;
  hash: string;
  url: string;
  duration_ms: number;
  content_type: string;
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

/** GUILD_AUDIT_LOG_ENTRY_CREATE — new audit log entry. */
export interface GatewayGuildAuditLogEntryCreateDispatchData extends APIGuildAuditLogEntry {
  guild_id?: Snowflake;
}

/** GUILD_COUNTS_UPDATE — member/online counts for guilds. */
export interface GatewayGuildCountEntry {
  guild_id: Snowflake;
  member_count: number;
  online_count: number;
}

export interface GatewayGuildCountsUpdateDispatchData {
  counts?: GatewayGuildCountEntry[];
}

/** CHANNEL_MEMBER_COUNTS_UPDATE — member/online counts for channels. */
export interface GatewayChannelMemberCountEntry {
  guild_id: Snowflake;
  channel_id: Snowflake;
  member_count: number;
  online_count: number;
}

export interface GatewayChannelMemberCountsUpdateDispatchData {
  counts?: GatewayChannelMemberCountEntry[];
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
  activities?: Array<{
    name: string;
    /** Activity type integer (no closed OpenAPI enum yet). */
    type: number;
    url?: string | null;
  }>;
  /** Custom status (Fluxer). */
  custom_status?: GatewayCustomStatus | null;
}

/** PRESENCE_UPDATE_BULK — multiple presence updates. */
export interface GatewayPresenceUpdateBulkDispatchData {
  presences: GatewayPresenceUpdateDispatchData[];
  guild_id?: Snowflake;
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
  sessions?: GatewaySession[];
}

/** USER_SETTINGS_UPDATE — user settings (theme, locale, etc.) changed */
export interface GatewayUserSettingsUpdateDispatchData {
  locale?: string;
  theme?: string;
  status?: string;
  custom_status?: GatewayCustomStatus | null;
  [key: string]: unknown;
}

/** USER_GUILD_SETTINGS_UPDATE — per-guild settings changed */
export interface GatewayUserGuildSettingsUpdateDispatchData {
  guild_id?: Snowflake;
  channel_overrides?: Array<{ channel_id: Snowflake; muted?: boolean; [key: string]: unknown }>;
  muted?: boolean;
  [key: string]: unknown;
}

/** USER_CONNECTIONS_UPDATE — linked external connections changed. */
export type GatewayUserConnectionsUpdateDispatchData = APIUserConnectionsUpdate;

/** WEBAUTHN_CREDENTIALS_UPDATE — WebAuthn credential list replaced. */
export type GatewayWebAuthnCredentialsUpdateDispatchData = APIWebAuthnCredential[];

/** USER_PINNED_DMS_UPDATE — pinned DM order changed */
export interface GatewayUserPinnedDmsUpdateDispatchData {
  pinned_channels?: Snowflake[];
  [key: string]: unknown;
}

/** USER_NOTE_UPDATE — note on another user changed */
export interface GatewayUserNoteUpdateDispatchData {
  id: Snowflake;
  note?: string | null;
}

/** RECENT_MENTION_DELETE — recent mention cleared */
export interface GatewayRecentMentionDeleteDispatchData {
  id?: Snowflake;
  channel_id?: Snowflake;
  guild_id?: Snowflake;
  [key: string]: unknown;
}

/** SAVED_MESSAGE_CREATE — message saved (bookmarked) */
export type GatewaySavedMessageCreateDispatchData = APIMessage;

/** SAVED_MESSAGE_DELETE — saved message unsaved */
export interface GatewaySavedMessageDeleteDispatchData {
  id: Snowflake;
}

/** AUTH_SESSION_CHANGE — login/logout on another client */
export interface GatewayAuthSessionChangeDispatchData {
  session_id?: string;
  kind?: 'login' | 'logout' | 'update' | string;
  [key: string]: unknown;
}

/** PASSIVE_UPDATES — lazy-loaded entity updates */
export interface GatewayPassiveUpdatesDispatchData {
  guild_id?: Snowflake;
  [key: string]: unknown;
}

/** GUILD_SYNC — guild sync state (passive/lazy) */
export interface GatewayGuildSyncDispatchData {
  id?: Snowflake;
  guild_id?: Snowflake;
  [key: string]: unknown;
}

/** RELATIONSHIP_ADD — relationship (friend, block) added */
export interface GatewayRelationshipAddDispatchData {
  id: Snowflake;
  type: RelationshipType;
}

/** RELATIONSHIP_UPDATE — relationship updated */
export interface GatewayRelationshipUpdateDispatchData {
  id: Snowflake;
  type: RelationshipType;
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
export type GatewayFavoriteMemeCreateDispatchData = GatewayFavoriteMemePayload;

/** FAVORITE_MEME_UPDATE — favorite meme/media updated */
export type GatewayFavoriteMemeUpdateDispatchData = GatewayFavoriteMemePayload;

/** FAVORITE_MEME_DELETE — favorite meme/media removed */
export type GatewayFavoriteMemeDeleteDispatchData = GatewayFavoriteMemePayload;

/** Active session object used by SESSIONS_REPLACE. */
export interface GatewaySession {
  session_id?: string;
  status?: string;
  activities?: Array<{ name?: string; type?: number; [key: string]: unknown }>;
  client_info?: {
    os?: string;
    client?: string;
    version?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Shared favorite meme/media payload shape. */
export interface GatewayFavoriteMemePayload {
  id?: Snowflake;
  user_id?: Snowflake;
  name?: string;
  url?: string;
  [key: string]: unknown;
}

/** Gateway event name to its exact wire payload. */
export interface GatewayDispatchDataMap {
  READY: GatewayReadyDispatchData;
  RESUMED: GatewayResumedDispatchData;
  SESSIONS_REPLACE: GatewaySessionsReplaceDispatchData;
  USER_UPDATE: GatewayUserUpdateDispatchData;
  USER_SETTINGS_UPDATE: GatewayUserSettingsUpdateDispatchData;
  USER_GUILD_SETTINGS_UPDATE: GatewayUserGuildSettingsUpdateDispatchData;
  USER_CONNECTIONS_UPDATE: GatewayUserConnectionsUpdateDispatchData;
  WEBAUTHN_CREDENTIALS_UPDATE: GatewayWebAuthnCredentialsUpdateDispatchData;
  USER_PINNED_DMS_UPDATE: GatewayUserPinnedDmsUpdateDispatchData;
  USER_NOTE_UPDATE: GatewayUserNoteUpdateDispatchData;
  RECENT_MENTION_DELETE: GatewayRecentMentionDeleteDispatchData;
  SAVED_MESSAGE_CREATE: GatewaySavedMessageCreateDispatchData;
  SAVED_MESSAGE_DELETE: GatewaySavedMessageDeleteDispatchData;
  AUTH_SESSION_CHANGE: GatewayAuthSessionChangeDispatchData;
  PRESENCE_UPDATE: GatewayPresenceUpdateDispatchData;
  PRESENCE_UPDATE_BULK: GatewayPresenceUpdateBulkDispatchData;
  GUILD_CREATE: GatewayGuildCreateDispatchData;
  GUILD_UPDATE: GatewayGuildUpdateDispatchData;
  GUILD_DELETE: GatewayGuildDeleteDispatchData;
  GUILD_MEMBER_ADD: GatewayGuildMemberAddDispatchData;
  GUILD_MEMBER_UPDATE: GatewayGuildMemberUpdateDispatchData;
  GUILD_MEMBER_REMOVE: GatewayGuildMemberRemoveDispatchData;
  GUILD_MEMBERS_CHUNK: GatewayGuildMembersChunkDispatchData;
  GUILD_MEMBER_LIST_UPDATE: GatewayGuildMemberListUpdateDispatchData;
  GUILD_SYNC: GatewayGuildSyncDispatchData;
  GUILD_COUNTS_UPDATE: GatewayGuildCountsUpdateDispatchData;
  CHANNEL_MEMBER_COUNTS_UPDATE: GatewayChannelMemberCountsUpdateDispatchData;
  GUILD_ROLE_CREATE: GatewayGuildRoleCreateDispatchData;
  GUILD_ROLE_UPDATE: GatewayGuildRoleUpdateDispatchData;
  GUILD_ROLE_UPDATE_BULK: GatewayGuildRoleUpdateBulkDispatchData;
  GUILD_ROLE_DELETE: GatewayGuildRoleDeleteDispatchData;
  GUILD_EMOJIS_UPDATE: GatewayGuildEmojisUpdateDispatchData;
  GUILD_STICKERS_UPDATE: GatewayGuildStickersUpdateDispatchData;
  GUILD_BAN_ADD: GatewayGuildBanAddDispatchData;
  GUILD_BAN_REMOVE: GatewayGuildBanRemoveDispatchData;
  GUILD_AUDIT_LOG_ENTRY_CREATE: GatewayGuildAuditLogEntryCreateDispatchData;
  CHANNEL_CREATE: GatewayChannelCreateDispatchData;
  CHANNEL_UPDATE: GatewayChannelUpdateDispatchData;
  CHANNEL_UPDATE_BULK: GatewayChannelUpdateBulkDispatchData;
  CHANNEL_DELETE: GatewayChannelDeleteDispatchData;
  CHANNEL_RECIPIENT_ADD: GatewayChannelRecipientAddDispatchData;
  CHANNEL_RECIPIENT_REMOVE: GatewayChannelRecipientRemoveDispatchData;
  CHANNEL_PINS_UPDATE: GatewayChannelPinsUpdateDispatchData;
  CHANNEL_PINS_ACK: GatewayChannelPinsAckDispatchData;
  PASSIVE_UPDATES: GatewayPassiveUpdatesDispatchData;
  INVITE_CREATE: GatewayInviteCreateDispatchData;
  INVITE_DELETE: GatewayInviteDeleteDispatchData;
  MESSAGE_CREATE: GatewayMessageCreateDispatchData;
  MESSAGE_UPDATE: GatewayMessageUpdateDispatchData;
  MESSAGE_DELETE: GatewayMessageDeleteDispatchData;
  MESSAGE_DELETE_BULK: GatewayMessageDeleteBulkDispatchData;
  MESSAGE_REACTION_ADD: GatewayMessageReactionAddDispatchData;
  MESSAGE_REACTION_ADD_MANY: GatewayMessageReactionAddManyDispatchData;
  MESSAGE_REACTION_REMOVE: GatewayMessageReactionRemoveDispatchData;
  MESSAGE_REACTION_REMOVE_ALL: GatewayMessageReactionRemoveAllDispatchData;
  MESSAGE_REACTION_REMOVE_EMOJI: GatewayMessageReactionRemoveEmojiDispatchData;
  MESSAGE_ACK: GatewayMessageAckDispatchData;
  TYPING_START: GatewayTypingStartDispatchData;
  WEBHOOKS_UPDATE: GatewayWebhooksUpdateDispatchData;
  RELATIONSHIP_ADD: GatewayRelationshipAddDispatchData;
  RELATIONSHIP_UPDATE: GatewayRelationshipUpdateDispatchData;
  RELATIONSHIP_REMOVE: GatewayRelationshipRemoveDispatchData;
  VOICE_STATE_UPDATE: GatewayVoiceStateUpdateDispatchData;
  VOICE_STATE_ACK: GatewayVoiceStateAckDispatchData;
  VOICE_SERVER_UPDATE: GatewayVoiceServerUpdateDispatchData;
  ENTRANCE_SOUND_PLAY: GatewayEntranceSoundPlayDispatchData;
  CALL_CREATE: GatewayCallCreateDispatchData;
  CALL_UPDATE: GatewayCallUpdateDispatchData;
  CALL_DELETE: GatewayCallDeleteDispatchData;
  FAVORITE_MEME_CREATE: GatewayFavoriteMemeCreateDispatchData;
  FAVORITE_MEME_UPDATE: GatewayFavoriteMemeUpdateDispatchData;
  FAVORITE_MEME_DELETE: GatewayFavoriteMemeDeleteDispatchData;
}

/** Wire data for a specific gateway dispatch event. */
export type GatewayDispatchEventData<Event extends GatewayDispatchEventName> =
  GatewayDispatchDataMap[Event];

/** Discriminated gateway dispatch payload. */
export type GatewayDispatchPayload<
  Event extends GatewayDispatchEventName = GatewayDispatchEventName,
> = Event extends GatewayDispatchEventName
  ? {
      op: GatewayOpcodes.Dispatch;
      d: GatewayDispatchEventData<Event>;
      s?: number;
      t: Event;
    }
  : never;

export interface GatewayReceivePayload<T = unknown> {
  op: GatewayOpcodes;
  d?: T;
  s?: number;
  t?: GatewayDispatchEventName;
}
