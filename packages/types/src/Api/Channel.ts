import type { Snowflake } from '../Common/Snowflake.js';
import type { ContentWarningLevel } from './Guild.js';
import type { APIMessage } from './Message.js';
import type { APIUser } from './User.js';

/**
 * Channel type enum (Fluxer OpenAPI).
 * - `GuildText` — text channel in a guild
 * - `DM` — private DM between two users
 * - `GuildVoice` — voice channel in a guild
 * - `GroupDM` — group DM with multiple users
 * - `GuildCategory` — category container for channels
 * - `GuildAnnouncement` — guild text channel whose messages can be published to followers (type 5)
 * - `GuildLink` — Fluxer link channel (OpenAPI GUILD_LINK, type 998)
 * - `DMPersonalNotes` — Fluxer personal notes DM (OpenAPI DM_PERSONAL_NOTES, type 999)
 */
export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  GuildLink = 998,
  DMPersonalNotes = 999,
}

/**
 * Permission overwrite type.
 * - `Role` — overwrite applies to a role
 * - `Member` — overwrite applies to a specific member
 */
export enum OverwriteType {
  Role = 0,
  Member = 1,
}

/** Permission overwrite from GET /channels/{id} or GET /guilds/{id}/channels. */
export interface APIChannelOverwrite {
  /** Role or member ID. */
  id: Snowflake;
  /** Whether this is a role or member overwrite. */
  type: OverwriteType;
  /** Permissions allowed (as bitfield string). */
  allow: string;
  /** Permissions denied (as bitfield string). */
  deny: string;
}

/** Minimal channel (id and type required). */
export interface APIChannelPartial {
  /** Channel ID. */
  id: Snowflake;
  /** Channel name. */
  name?: string | null;
  /** Channel type (see {@link ChannelType}). */
  type: ChannelType;
  /** Channel icon hash (group DMs / some partials). */
  icon?: string | null;
  /** Parent category ID (some partials). */
  parent_id?: Snowflake | null;
  /** DM recipients (username only on some partial payloads). */
  recipients?: Array<APIUser | { username: string }>;
}

/**
 * Full channel object from GET /channels/{id} or GET /guilds/{id}/channels.
 */
export interface APIChannel extends Omit<APIChannelPartial, 'name' | 'recipients'> {
  /** Guild ID (absent for DMs). */
  guild_id?: Snowflake;
  /** Channel name. */
  name?: string;
  /** Channel topic. */
  topic?: string | null;
  /** External URL (link channels, type 998). */
  url?: string | null;
  /** Channel icon hash. */
  icon?: string | null;
  /** Owner ID (group DMs). */
  owner_id?: Snowflake | null;
  /** Sort position in the channel list. */
  position?: number;
  /** Parent category ID. */
  parent_id?: Snowflake | null;
  /** Voice bitrate (kbps). */
  bitrate?: number | null;
  /** Voice user limit (0 = unlimited). */
  user_limit?: number | null;
  /** Max active voice connections per user in this channel. */
  voice_connection_limit?: number | null;
  /** Voice RTC region ID. */
  rtc_region?: string | null;
  /** Last message ID in this channel. */
  last_message_id?: Snowflake | null;
  /** ISO-8601 timestamp of last pin. */
  last_pin_timestamp?: string | null;
  /** Permission overwrites. */
  permission_overwrites?: APIChannelOverwrite[];
  /** DM/group DM recipients. */
  recipients?: APIUser[];
  /** Whether the channel is NSFW. */
  nsfw?: boolean;
  /** Per-channel NSFW override (`null` inherits). */
  nsfw_override?: boolean | null;
  /** Slowmode delay in seconds. */
  rate_limit_per_user?: number;
  /** User-specific nicknames in group DMs (user_id -> nick). */
  nicks?: Record<string, string>;
  /** Content warning level. */
  content_warning_level?: ContentWarningLevel;
  /** Content warning custom text. */
  content_warning_text?: string | null;
}

/** RTC region from GET /channels/{id}/rtc-regions. */
export interface APIRtcRegion {
  /** Region ID. */
  id: string;
  /** Human-readable region name. */
  name: string;
  /** Region flag emoji. */
  emoji: string;
}

/** Slowmode state from GET /channels/{id}/slowmode. */
export interface APIChannelSlowmodeState {
  /** Slowmode delay in seconds. */
  rate_limit_per_user: number;
  /** Milliseconds until the user can send again. */
  retry_after_ms: number;
  /** ISO-8601 timestamp when the user can send again. */
  next_send_allowed_at: string | null;
}

/** Single pin from GET /channels/{id}/messages/pins. */
export interface APIChannelPinItem {
  /** The pinned message. */
  message: APIMessage;
  /** ISO-8601 timestamp when pinned. */
  pinned_at: string;
}

/** Paginated pins response from GET /channels/{id}/messages/pins. */
export interface APIChannelPinsPage {
  /** Pinned messages on this page. */
  items: APIChannelPinItem[];
  /** Whether more pins exist. */
  has_more: boolean;
}

/** Shared optional fields on guild channel create bodies. */
interface ChannelCreateShared {
  /** Channel topic. */
  topic?: string | null;
  /** External URL (link channels). */
  url?: string | null;
  /** Parent category ID. */
  parent_id?: Snowflake | null;
  /** Voice bitrate (kbps). */
  bitrate?: number | null;
  /** Voice user limit. */
  user_limit?: number | null;
  /** Voice connection limit. */
  voice_connection_limit?: number | null;
  /** Permission overwrites. */
  permission_overwrites?: APIChannelOverwrite[];
  /** Whether the channel is NSFW. */
  nsfw?: boolean;
  /** NSFW override flag. */
  nsfw_override?: boolean | null;
  /** Content warning level. */
  content_warning_level?: ContentWarningLevel;
  /** Content warning custom text. */
  content_warning_text?: string | null;
  /** Slowmode delay in seconds (0–21600). */
  rate_limit_per_user?: number | null;
  /** Channel name. */
  name: string;
}

/** POST /guilds/{id}/channels — text channel (type 0). */
export interface GuildTextChannelCreateRequest extends ChannelCreateShared {
  type: ChannelType.GuildText;
}

/** POST /guilds/{id}/channels — voice channel (type 2). */
export interface GuildVoiceChannelCreateRequest extends ChannelCreateShared {
  type: ChannelType.GuildVoice;
}

/** POST /guilds/{id}/channels — category (type 4). */
export interface GuildCategoryChannelCreateRequest extends ChannelCreateShared {
  type: ChannelType.GuildCategory;
}

/** POST /guilds/{id}/channels — announcement channel (type 5). */
export interface GuildAnnouncementChannelCreateRequest extends ChannelCreateShared {
  type: ChannelType.GuildAnnouncement;
}

/** POST /guilds/{id}/channels — link channel (type 998); set `url`. */
export interface GuildLinkChannelCreateRequest extends ChannelCreateShared {
  type: ChannelType.GuildLink;
  url?: string | null;
}

/** Union of all valid channel create request types. */
export type ChannelCreateRequest =
  | GuildTextChannelCreateRequest
  | GuildVoiceChannelCreateRequest
  | GuildCategoryChannelCreateRequest
  | GuildAnnouncementChannelCreateRequest
  | GuildLinkChannelCreateRequest;
