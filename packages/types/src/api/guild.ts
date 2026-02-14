import type { Snowflake } from '../common/snowflake.js';

export enum GuildVerificationLevel {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  VeryHigh = 4,
}

export enum GuildMFALevel {
  None = 0,
  Elevated = 1,
}

export enum GuildExplicitContentFilter {
  Disabled = 0,
  MembersWithoutRoles = 1,
  AllMembers = 2,
}

export enum DefaultMessageNotifications {
  AllMessages = 0,
  OnlyMentions = 1,
}

export type GuildFeature =
  | 'ANIMATED_ICON'
  | 'ANIMATED_BANNER'
  | 'BANNER'
  | 'DETACHED_BANNER'
  | 'INVITE_SPLASH'
  | 'INVITES_DISABLED'
  | 'TEXT_CHANNEL_FLEXIBLE_NAMES'
  | 'MORE_EMOJI'
  | 'MORE_STICKERS'
  | 'UNLIMITED_EMOJI'
  | 'UNLIMITED_STICKERS'
  | 'EXPRESSION_PURGE_ALLOWED'
  | 'VANITY_URL'
  | 'VERIFIED'
  | 'VIP_VOICE'
  | 'UNAVAILABLE_FOR_EVERYONE'
  | 'UNAVAILABLE_FOR_EVERYONE_BUT_STAFF'
  | 'VISIONARY'
  | 'OPERATOR'
  | 'LARGE_GUILD_OVERRIDE'
  | 'VERY_LARGE_GUILD'
  | 'MT_MESSAGE_SCHEDULING'
  | 'MT_EXPRESSION_PACKS';

export interface APIGuild {
  id: Snowflake;
  name: string;
  icon: string | null;
  banner: string | null;
  banner_width?: number | null;
  banner_height?: number | null;
  splash?: string | null;
  vanity_url_code?: string | null;
  owner_id: Snowflake;
  system_channel_id?: Snowflake | null;
  rules_channel_id?: Snowflake | null;
  afk_channel_id?: Snowflake | null;
  afk_timeout: number;
  features: GuildFeature[];
  verification_level: GuildVerificationLevel;
  mfa_level: GuildMFALevel;
  nsfw_level: number;
  explicit_content_filter: GuildExplicitContentFilter;
  default_message_notifications: DefaultMessageNotifications;
  permissions?: string | null;
}
