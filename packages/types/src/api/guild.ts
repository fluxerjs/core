import type { Snowflake } from '../common/snowflake.js';
import type { WebhookType } from './webhook.js';

/**
 * Guild verification level (OpenAPI VerificationLevel).
 * - `None` — unrestricted
 * - `Low` — must have verified email
 * - `Medium` — must be registered for 5+ minutes
 * - `High` — must be member for 10+ minutes
 * - `VeryHigh` — must have verified phone
 */
export enum GuildVerificationLevel {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  VeryHigh = 4,
}

/**
 * Guild MFA level (OpenAPI MFALevel).
 * - `None` — no MFA requirement
 * - `Elevated` — moderators must have MFA enabled
 */
export enum GuildMFALevel {
  None = 0,
  Elevated = 1,
}

/**
 * Guild explicit content filter (OpenAPI ExplicitContentFilterLevel).
 * - `Disabled` — no content scanning
 * - `MembersWithoutRoles` — scan messages from members without roles
 * - `AllMembers` — scan all messages
 */
export enum GuildExplicitContentFilter {
  Disabled = 0,
  MembersWithoutRoles = 1,
  AllMembers = 2,
}

/**
 * Default message notification level (OpenAPI DefaultMessageNotificationLevel).
 * - `AllMessages` — notify for all messages
 * - `OnlyMentions` — notify only for mentions
 */
export enum DefaultMessageNotifications {
  AllMessages = 0,
  OnlyMentions = 1,
}

/**
 * Guild NSFW level (OpenAPI NSFWLevel).
 * - `Safe` — guild is safe for work
 * - `AgeRestricted` — guild is age-restricted / NSFW
 */
export enum GuildNSFWLevel {
  Safe = 0,
  AgeRestricted = 3,
}

/**
 * Content warning level for guild / category / channel (OpenAPI ContentWarningLevel).
 * - `Inherit` — inherit from parent
 * - `ContentWarning` — show content warning
 */
export enum ContentWarningLevel {
  Inherit = 0,
  ContentWarning = 1,
}

/**
 * Splash card alignment (OpenAPI GuildUpdateRequest.splash_card_alignment).
 * - `Center` — center alignment
 * - `Left` — left alignment
 * - `Right` — right alignment
 */
export enum SplashCardAlignment {
  Center = 0,
  Left = 1,
  Right = 2,
}

/**
 * Audit log action type (OpenAPI AuditLogActionType).
 * Each value represents a specific moderation or administrative action.
 */
export enum AuditLogActionType {
  /** Guild settings updated */
  GuildUpdate = 1,
  /** Channel created */
  ChannelCreate = 10,
  /** Channel settings updated */
  ChannelUpdate = 11,
  /** Channel deleted */
  ChannelDelete = 12,
  /** Channel permission overwrite created */
  ChannelOverwriteCreate = 13,
  /** Channel permission overwrite updated */
  ChannelOverwriteUpdate = 14,
  /** Channel permission overwrite deleted */
  ChannelOverwriteDelete = 15,
  /** Member kicked from guild */
  MemberKick = 20,
  /** Members pruned (inactive cleanup) */
  MemberPrune = 21,
  /** Member banned */
  MemberBanAdd = 22,
  /** Member unbanned */
  MemberBanRemove = 23,
  /** Member profile updated */
  MemberUpdate = 24,
  /** Member roles changed */
  MemberRoleUpdate = 25,
  /** Members moved to different voice channel */
  MemberMove = 26,
  /** Members disconnected from voice */
  MemberDisconnect = 27,
  /** Bot added to guild */
  BotAdd = 28,
  /** Role created */
  RoleCreate = 30,
  /** Role settings updated */
  RoleUpdate = 31,
  /** Role deleted */
  RoleDelete = 32,
  /** Invite created */
  InviteCreate = 40,
  /** Invite settings updated */
  InviteUpdate = 41,
  /** Invite deleted */
  InviteDelete = 42,
  /** Webhook created */
  WebhookCreate = 50,
  /** Webhook settings updated */
  WebhookUpdate = 51,
  /** Webhook deleted */
  WebhookDelete = 52,
  /** Custom emoji created */
  EmojiCreate = 60,
  /** Custom emoji updated */
  EmojiUpdate = 61,
  /** Custom emoji deleted */
  EmojiDelete = 62,
  /** Message deleted */
  MessageDelete = 72,
  /** Multiple messages deleted at once */
  MessageBulkDelete = 73,
  /** Message pinned */
  MessagePin = 74,
  /** Message unpinned */
  MessageUnpin = 75,
  /** Custom sticker created */
  StickerCreate = 90,
  /** Custom sticker updated */
  StickerUpdate = 91,
  /** Custom sticker deleted */
  StickerDelete = 92,
}

/**
 * System channel message flags (OpenAPI SystemChannelFlags).
 * - `SuppressJoinNotifications` — disable member join messages
 * Bitfield — compose with bitwise OR.
 */
export const SystemChannelFlags = {
  SuppressJoinNotifications: 1,
} as const;

/** Union of all valid {@link SystemChannelFlags} values. */
export type SystemChannelFlagsValue = (typeof SystemChannelFlags)[keyof typeof SystemChannelFlags];

/**
 * Disabled guild operations bitfield (OpenAPI GuildOperations).
 * - `PushNotifications` — push notifications disabled
 * - `EveryoneMentions` — @everyone/@here mentions disabled
 * - `TypingEvents` — typing indicators disabled
 * - `InstantInvites` — instant invites disabled
 * - `SendMessage` — sending messages disabled
 * - `Reactions` — reactions disabled
 * - `MemberListUpdates` — member list updates disabled
 * Bits set = operation disabled.
 */
export const GuildOperations = {
  PushNotifications: 1,
  EveryoneMentions: 2,
  TypingEvents: 4,
  InstantInvites: 8,
  SendMessage: 16,
  Reactions: 32,
  MemberListUpdates: 64,
} as const;

/** Union of all valid {@link GuildOperations} values. */
export type GuildOperationsValue = (typeof GuildOperations)[keyof typeof GuildOperations];

/**
 * Guild feature flags (OpenAPI GuildFeatures).
 * - `ANIMATED_ICON` — animated guild icon
 * - `ANIMATED_BANNER` — animated guild banner
 * - `BANNER` — guild banner
 * - `DETACHED_BANNER` — banner on separate canvas
 * - `INVITE_SPLASH` — invite splash screen
 * - `INVITES_DISABLED` — invites disabled
 * - `TEXT_CHANNEL_FLEXIBLE_NAMES` — flexible text channel naming
 * - `MORE_EMOJI` — extra emoji slots
 * - `MORE_STICKERS` — extra sticker slots
 * - `UNLIMITED_EMOJI` — unlimited emoji
 * - `UNLIMITED_STICKERS` — unlimited stickers
 * - `EXPRESSION_PURGE_ALLOWED` — can purge emoji/stickers
 * - `VANITY_URL` — custom vanity URL
 * - `VERIFIED` — verified guild badge
 * - `VIP_VOICE` — VIP voice regions
 * - `UNAVAILABLE_FOR_EVERYONE` — guild unavailable for non-staff
 * - `UNAVAILABLE_FOR_EVERYONE_BUT_STAFF` — guild unavailable except for staff
 * - `VISIONARY` — visionary guild badge
 * - `OPERATOR` — operator guild badge
 * - `LARGE_GUILD_OVERRIDE` — large guild override
 * - `VERY_LARGE_GUILD` — very large guild (>100k members)
 * - `MT_MESSAGE_SCHEDULING` — message scheduling enabled
 * - `MT_EXPRESSION_PACKS` — expression packs enabled
 */
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
 * Full guild object from GET /guilds/{id} or gateway GUILD_CREATE.
 */
export interface APIGuild {
  /** Guild ID. */
  id: Snowflake;
  /** Guild name. */
  name: string;
  /** Guild icon hash. */
  icon: string | null;
  /** Guild banner hash. */
  banner: string | null;
  /** Banner width in pixels. */
  banner_width?: number | null;
  /** Banner height in pixels. */
  banner_height?: number | null;
  /** Invite splash image hash. */
  splash?: string | null;
  /** Splash width in pixels. */
  splash_width?: number | null;
  /** Splash height in pixels. */
  splash_height?: number | null;
  /** Splash card alignment (see {@link SplashCardAlignment}). */
  splash_card_alignment?: SplashCardAlignment;
  /** Embed splash image hash (deprecated). */
  embed_splash?: string | null;
  /** Embed splash width in pixels. */
  embed_splash_width?: number | null;
  /** Embed splash height in pixels. */
  embed_splash_height?: number | null;
  /** Custom vanity URL code. */
  vanity_url_code?: string | null;
  /** Guild owner user ID. */
  owner_id: Snowflake;
  /** System channel ID (join/boost messages). */
  system_channel_id?: Snowflake | null;
  /** {@link SystemChannelFlags} bitfield. */
  system_channel_flags?: number;
  /** Rules channel ID. */
  rules_channel_id?: Snowflake | null;
  /** AFK voice channel ID. */
  afk_channel_id?: Snowflake | null;
  /** AFK timeout in seconds. */
  afk_timeout: number;
  /** Guild feature flags (see {@link GuildFeature}). */
  features: GuildFeature[];
  /** Verification level (see {@link GuildVerificationLevel}). */
  verification_level: GuildVerificationLevel;
  /** MFA requirement level (see {@link GuildMFALevel}). */
  mfa_level: GuildMFALevel;
  /** NSFW level (see {@link GuildNSFWLevel}). */
  nsfw_level: GuildNSFWLevel;
  /** Explicit content filter level (see {@link GuildExplicitContentFilter}). */
  explicit_content_filter: GuildExplicitContentFilter;
  /** Default notification level (see {@link DefaultMessageNotifications}). */
  default_message_notifications: DefaultMessageNotifications;
  /** {@link GuildOperations} bitfield of disabled operations. */
  disabled_operations?: number;
  /** Content warning level (see {@link ContentWarningLevel}). */
  content_warning_level?: ContentWarningLevel;
  /** ISO-8601 timestamp before which message history is not available. */
  message_history_cutoff?: string | null;
  /** Permissions for the current user in this guild (bitfield string). */
  permissions?: string | null;
  /** Member count when included in the guild payload. */
  member_count?: number;
}

/** Audit log entry from GET /guilds/{id}/audit-logs. */
export interface APIGuildAuditLogEntry {
  /** Entry ID. */
  id: string;
  /** Action type (see {@link AuditLogActionType}). */
  action_type: AuditLogActionType;
  /** User who performed the action. */
  user_id?: Snowflake | null;
  /** Target entity ID (channel, member, role, etc.). */
  target_id?: Snowflake | null;
  /** Reason provided for the action. */
  reason?: string | null;
  /** Action-specific metadata (e.g. role name, channel name). */
  options?: Record<string, string>;
  /** Changed fields; value types vary by action_type (e.g. string for name, number for permissions). */
  changes?: Array<{
    key: string;
    old_value?: string | number | boolean | null;
    new_value?: string | number | boolean | null;
  }>;
}

/** Response from GET /guilds/{id}/vanity-url. */
export interface APIVanityURL {
  /** Vanity URL code (null if not set). */
  code: string | null;
  /** Number of times the vanity URL has been used. */
  uses: number;
}

/** Request body for guild feature toggles (text-channel-flexible-names, etc.). */
export interface APIGuildFeatureToggle {
  /** Whether to enable the feature. */
  enabled: boolean;
}

/** Response from GET /guilds/{id}/audit-logs. */
export interface APIGuildAuditLog {
  /** Audit log entries. */
  audit_log_entries: APIGuildAuditLogEntry[];
  /** Partial user objects referenced in the log. */
  users: Array<{
    id: Snowflake;
    username?: string;
    discriminator?: string;
    avatar?: string | null;
  }>;
  /** Partial webhook objects referenced in the log. */
  webhooks: Array<{
    id: Snowflake;
    name?: string;
    avatar?: string | null;
    type?: WebhookType;
  }>;
}

/** Request body for POST /guilds/{id}/members-search. */
export interface APIGuildMemberSearchRequest {
  /** Username or nickname search query. */
  query?: string;
  /** Maximum results to return. */
  limit?: number;
  /** Result offset for pagination. */
  offset?: number;
  /** Filter by role IDs. */
  role_ids?: Snowflake[];
  /** Filter by joined date (Unix timestamp, greater or equal). */
  joined_at_gte?: number;
  /** Filter by joined date (Unix timestamp, less or equal). */
  joined_at_lte?: number;
  /** Filter by bot status. */
  is_bot?: boolean;
  /** Filter by user creation date (Unix timestamp, greater or equal). */
  user_created_at_gte?: number;
  /** Filter by user creation date (Unix timestamp, less or equal). */
  user_created_at_lte?: number;
  /** Sort field. */
  sort_by?: 'joinedAt' | 'relevance';
  /** Sort order. */
  sort_order?: 'asc' | 'desc';
}

/** Single result from guild member search. */
export interface APIGuildMemberSearchResult {
  /** Member ID. */
  id: string;
  /** Guild ID. */
  guild_id: Snowflake;
  /** User ID. */
  user_id: Snowflake;
  /** Username. */
  username: string;
  /** Discriminator. */
  discriminator: string;
  /** Display name. */
  global_name: string | null;
  /** Guild nickname. */
  nickname: string | null;
}

/** Response from POST /guilds/{id}/members-search. */
export interface APIGuildMemberSearchResponse {
  /** Guild ID. */
  guild_id: Snowflake;
  /** Search results for this page. */
  members: APIGuildMemberSearchResult[];
  /** Number of results on this page. */
  page_result_count: number;
  /** Total results across all pages. */
  total_result_count: number;
  /** Whether the search index is still building. */
  indexing?: boolean;
}
