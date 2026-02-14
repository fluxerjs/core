import type { Snowflake } from '../common/snowflake.js';
import type { APIUser } from './user.js';

/** Channel type enum (Fluxer/Discord compatible) */
export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildLink = 5,
}

/** Permission overwrite type */
export enum OverwriteType {
  Role = 0,
  Member = 1,
}

export interface APIChannelOverwrite {
  id: Snowflake;
  type: OverwriteType;
  allow: string;
  deny: string;
}

export interface APIChannelPartial {
  id: Snowflake;
  name?: string | null;
  type: ChannelType;
  icon?: string | null;
  parent_id?: Snowflake | null;
}

export interface APIChannel extends APIChannelPartial {
  guild_id?: Snowflake | null;
  name: string | null;
  topic?: string | null;
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
