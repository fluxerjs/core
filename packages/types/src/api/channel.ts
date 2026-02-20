import { Snowflake } from '../common/snowflake.js';
import { APIUser } from './user.js';

/**
 * Channel type enum (Fluxer/Discord compatible).
 * API may return additional types (e.g. 998 for link channels with url).
 */
export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildLink = 5,
  /** Fluxer link channel (GET /guilds/{id}/channels returns type 998 for url channels) */
  GuildLinkExtended = 998,
}

/** Permission overwrite type */
export enum OverwriteType {
  Role = 0,
  Member = 1,
}

/** Permission overwrite from GET /channels/{id} or GET /guilds/{id}/channels */
export interface APIChannelOverwrite {
  id: Snowflake;
  type: OverwriteType;
  allow: string;
  deny: string;
}

/** Minimal channel (id, type required) */
export interface APIChannelPartial {
  id: Snowflake;
  name?: string | null;
  type: ChannelType | number;
  icon?: string | null;
  parent_id?: Snowflake | null;
}

/**
 * Channel from GET /channels/{id} or GET /guilds/{id}/channels
 */
export interface APIChannel extends APIChannelPartial {
  guild_id?: Snowflake | null;
  name: string | null;
  topic?: string | null;
  /** External URL (link channels, type 998) */
  url?: string | null;
  icon?: string | null;
  owner_id?: Snowflake | null;
  position?: number;
  parent_id: Snowflake | null;
  bitrate?: number | null;
  user_limit?: number | null;
  rtc_region?: string | null;
  last_message_id?: Snowflake | null;
  last_pin_timestamp?: string | null;
  permission_overwrites?: APIChannelOverwrite[];
  recipients?: APIUser[];
  nsfw?: boolean;
  rate_limit_per_user?: number;
  nicks?: Record<string, string>;
}
