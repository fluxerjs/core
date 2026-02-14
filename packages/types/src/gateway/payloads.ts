import type { Snowflake } from '../common/snowflake.js';
import type { APIUser } from '../api/user.js';
import type { APIChannel } from '../api/channel.js';
import type { APIGuild } from '../api/guild.js';
import type { APIMessage } from '../api/message.js';
import type { APIGuildMember } from '../api/user.js';
import type { APIRole } from '../api/role.js';
import { GatewayOpcodes } from './opcodes.js';
import type { GatewayDispatchEventName } from './events.js';

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
}

export type GatewaySendPayload =
  | { op: GatewayOpcodes.Identify; d: GatewayIdentifyData }
  | { op: GatewayOpcodes.Resume; d: GatewayResumeData }
  | { op: GatewayOpcodes.Heartbeat; d: number | null }
  | { op: GatewayOpcodes.PresenceUpdate; d: GatewayPresenceUpdateData }
  | { op: GatewayOpcodes.VoiceStateUpdate; d: GatewayVoiceStateUpdateData }
  | { op: GatewayOpcodes.RequestGuildMembers; d: { guild_id: Snowflake; query?: string; limit: number } };

// Incoming (gateway -> client)
export interface GatewayHelloData {
  heartbeat_interval: number;
}

export interface GatewayReadyDispatchData {
  v: number;
  user: APIUser;
  guilds: Array<APIGuild & { unavailable?: boolean }>;
  session_id: string;
  shard?: [number, number];
  application: { id: Snowflake; flags: number };
}

export type GatewayMessageCreateDispatchData = APIMessage;
export type GatewayMessageUpdateDispatchData = APIMessage;
export interface GatewayMessageDeleteDispatchData {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
}

export interface GatewayMessageDeleteBulkDispatchData {
  ids: Snowflake[];
  channel_id: Snowflake;
  guild_id?: Snowflake;
}

/** Emoji data sent with reaction events (id is null for unicode emoji). */
export interface GatewayReactionEmoji {
  id: Snowflake | null;
  name: string;
  animated?: boolean;
}

export interface GatewayMessageReactionAddDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  user_id: Snowflake;
  guild_id?: Snowflake;
  emoji: GatewayReactionEmoji;
}

export interface GatewayMessageReactionRemoveDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  user_id: Snowflake;
  guild_id?: Snowflake;
  emoji: GatewayReactionEmoji;
}

export interface GatewayMessageReactionRemoveEmojiDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  emoji: GatewayReactionEmoji;
}

export interface GatewayMessageReactionRemoveAllDispatchData {
  message_id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake;
}

export type GatewayGuildCreateDispatchData = APIGuild & { unavailable?: boolean };
export type GatewayGuildUpdateDispatchData = APIGuild;
export interface GatewayGuildDeleteDispatchData {
  id: Snowflake;
  unavailable?: boolean;
}

export type GatewayChannelCreateDispatchData = APIChannel;
export type GatewayChannelUpdateDispatchData = APIChannel;
export type GatewayChannelDeleteDispatchData = APIChannel;

export type GatewayGuildMemberAddDispatchData = APIGuildMember & { guild_id: Snowflake };
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
export interface GatewayGuildMemberRemoveDispatchData {
  guild_id: Snowflake;
  user: APIUser;
}

export interface GatewayGuildRoleCreateDispatchData {
  guild_id: Snowflake;
  role: APIRole;
}
export interface GatewayGuildRoleUpdateDispatchData {
  guild_id: Snowflake;
  role: APIRole;
}
export interface GatewayGuildRoleDeleteDispatchData {
  guild_id: Snowflake;
  role_id: Snowflake;
}

/** Incoming voice state update (gateway -> client). */
export interface GatewayVoiceStateUpdateDispatchData {
  guild_id?: Snowflake;
  channel_id: Snowflake | null;
  user_id: Snowflake;
  member?: APIGuildMember & { guild_id?: Snowflake };
  session_id: string;
  deaf?: boolean;
  mute?: boolean;
  self_deaf?: boolean;
  self_mute?: boolean;
  self_video?: boolean;
  suppress?: boolean;
}

/** Incoming voice server update (gateway -> client). */
export interface GatewayVoiceServerUpdateDispatchData {
  token: string;
  guild_id: Snowflake;
  endpoint: string | null;
}

export interface GatewayReceivePayload<T = unknown> {
  op: GatewayOpcodes;
  d?: T;
  s?: number;
  t?: GatewayDispatchEventName;
}
