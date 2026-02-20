import { Snowflake } from '../common/snowflake.js';

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

/**
 * Guild from GET /guilds/{id} or gateway GUILD_CREATE
 */
export interface APIGuild {
  id: Snowflake;
  name: string;
  icon: string | null;
  banner: string | null;
  banner_width?: number | null;
  banner_height?: number | null;
  splash?: string | null;
  splash_width?: number | null;
  splash_height?: number | null;
  splash_card_alignment?: number;
  embed_splash?: string | null;
  embed_splash_width?: number | null;
  embed_splash_height?: number | null;
  vanity_url_code?: string | null;
  owner_id: Snowflake;
  system_channel_id?: Snowflake | null;
  system_channel_flags?: number;
  rules_channel_id?: Snowflake | null;
  afk_channel_id?: Snowflake | null;
  afk_timeout: number;
  features: GuildFeature[];
  verification_level: GuildVerificationLevel;
  mfa_level: GuildMFALevel;
  nsfw_level: number;
  explicit_content_filter: GuildExplicitContentFilter;
  default_message_notifications: DefaultMessageNotifications;
  disabled_operations?: number;
  message_history_cutoff?: string | null;
  permissions?: string | null;
}

/** Audit log entry from GET /guilds/{id}/audit-logs */
export interface APIGuildAuditLogEntry {
  id: string;
  action_type: number;
  user_id?: Snowflake | null;
  target_id?: Snowflake | null;
  reason?: string | null;
  /** Changed fields. Value types vary by action_type (e.g. string for name, number for permissions). */
  changes?: Array<{
    key: string;
    old_value?: string | number | boolean | null;
    new_value?: string | number | boolean | null;
  }>;
}

/** Response from GET /guilds/{id}/vanity-url */
export interface APIVanityURL {
  code: string | null;
  uses: number;
}

/** Request body for guild feature toggles (text-channel-flexible-names, etc.) */
export interface APIGuildFeatureToggle {
  enabled: boolean;
}

/** Response from GET /guilds/{id}/audit-logs */
export interface APIGuildAuditLog {
  audit_log_entries: APIGuildAuditLogEntry[];
  users: Array<{
    id: Snowflake;
    username?: string;
    discriminator?: string;
    avatar?: string | null;
  }>;
  webhooks: Array<{ id: Snowflake; name?: string; avatar?: string | null }>;
}
