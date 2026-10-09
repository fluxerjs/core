import type { Snowflake } from '../Common/Snowflake.js';
import type { ChannelType } from './Channel.js';
import type { APIGuildMember } from './User.js';

/**
 * Minutes of inactivity before a thread stops showing in the channel list
 * (OpenAPI ThreadAutoArchiveDurationSchema).
 * - `OneHour`: 60
 * - `OneDay`: 1440
 * - `ThreeDays`: 4320
 * - `OneWeek`: 10080
 */
export enum ThreadAutoArchiveDuration {
  OneHour = 60,
  OneDay = 1440,
  ThreeDays = 4320,
  OneWeek = 10080,
}

/**
 * Default sort order for forum and media posts (OpenAPI ForumSortOrderSchema).
 * - `LatestActivity`: sort by the latest message
 * - `CreationTime`: sort by when the post was created
 */
export enum ForumSortOrder {
  LatestActivity = 0,
  CreationTime = 1,
}

/**
 * Default layout of a forum channel (OpenAPI ForumLayoutSchema).
 * - `Default`: no default layout
 * - `List`: posts as a list
 * - `Grid`: posts as tiles
 */
export enum ForumLayout {
  Default = 0,
  List = 1,
  Grid = 2,
}

/**
 * How posts are filtered when searching by several tags (OpenAPI ForumTagSettingSchema).
 * - `MatchSome`: a post matches if it has any of the tags
 * - `MatchAll`: a post matches only if it has every tag
 */
export enum ForumTagSetting {
  MatchSome = 'match_some',
  MatchAll = 'match_all',
}

/**
 * Thread member notification flags (OpenAPI ThreadMemberSettingsRequest).
 * - `AllMessages`: notify for every message (`1 << 1`)
 * - `OnlyMentions`: notify only for mentions (`1 << 2`)
 * - `NoMessages`: never notify (`1 << 3`)
 */
export const ThreadMemberFlags = {
  AllMessages: 1 << 1,
  OnlyMentions: 1 << 2,
  NoMessages: 1 << 3,
} as const;

/** Channel types that are threads. */
export type ThreadChannelType =
  | ChannelType.AnnouncementThread
  | ChannelType.PublicThread
  | ChannelType.PrivateThread;

/** Thread-specific fields (OpenAPI ThreadMetadataResponse). */
export interface APIThreadMetadata {
  /** Whether the thread is archived. */
  archived: boolean;
  /** Minutes of inactivity before the thread stops showing in the channel list. */
  auto_archive_duration: number;
  /** ISO-8601 timestamp when the archive status last changed. */
  archive_timestamp: string;
  /** Whether only moderators can unarchive the thread. */
  locked: boolean;
  /** Whether non-moderators can add other non-moderators. Private threads only. */
  invitable?: boolean;
  /** ISO-8601 timestamp when the thread was created. */
  create_timestamp: string;
}

/** Mute window on a thread membership. */
export interface APIThreadMemberMuteConfig {
  /** ISO-8601 timestamp when the mute expires, or null if it does not expire. */
  end_time?: string | null;
  /** Selected mute duration in seconds. */
  selected_time_window: number;
}

/** A user who has joined a thread (OpenAPI ThreadMemberResponse). */
export interface APIThreadMember {
  /** Thread ID. Present when the member is returned outside the thread object. */
  id?: Snowflake;
  /** User ID. */
  user_id?: Snowflake;
  /** ISO-8601 timestamp when the user last joined the thread. */
  join_timestamp: string;
  /** Thread member flags (see {@link ThreadMemberFlags}). */
  flags: number;
  /** Whether the current user has muted the thread. */
  muted?: boolean;
  /** Mute configuration for the current user. */
  mute_config?: APIThreadMemberMuteConfig | null;
  /** Guild member, when requested with `with_member`. */
  member?: APIGuildMember;
}

/** Tag sent when creating or replacing forum and media tags (OpenAPI ForumTagUpdateRequest). */
export interface APIForumTagUpdate {
  /** Existing tag ID. Omit when creating a tag inside a channel create or tag list replace. */
  id?: Snowflake;
  /** Tag name (1-50 characters). */
  name: string;
  /** Whether only moderators can apply or remove this tag. */
  moderated?: boolean;
  /** Custom guild emoji ID. `null` clears it. */
  emoji_id?: Snowflake | null;
  /** Unicode emoji. `null` clears it. */
  emoji_name?: string | null;
}

/** Tag that can be applied to a forum or media post (OpenAPI ForumTagResponse). */
export interface APIForumTag {
  /** Tag ID. */
  id: Snowflake;
  /** Tag name (1-50 characters). */
  name: string;
  /** Whether only moderators can apply or remove this tag. */
  moderated: boolean;
  /** Custom guild emoji ID, or null when {@link emoji_name} is set. */
  emoji_id: Snowflake | null;
  /** Unicode emoji, or null when {@link emoji_id} is set. */
  emoji_name: string | null;
}

/** Default reaction applied to new forum or media posts. */
export interface APIDefaultReactionEmoji {
  /** Custom guild emoji ID, or null for a unicode emoji. */
  emoji_id: Snowflake | null;
  /** Unicode emoji, or null for a custom emoji. */
  emoji_name: string | null;
}

/** POST /channels/{id}/threads without a starter message (OpenAPI StartThreadRequest). */
export interface APIStartThreadRequest {
  /** Thread name (1-100 characters). */
  name: string;
  /** Public, private, or announcement thread. */
  type: ThreadChannelType;
  /** Minutes of inactivity before the thread archives. */
  auto_archive_duration?: ThreadAutoArchiveDuration;
  /** Slowmode in seconds copied onto the thread (0-21600). */
  rate_limit_per_user?: number;
  /** Whether non-moderators can add other non-moderators. Private threads only. */
  invitable?: boolean;
}

/** POST /channels/{id}/messages/{id}/threads (OpenAPI StartThreadFromMessageRequest). */
export interface APIStartThreadFromMessageRequest {
  /** Thread name (1-100 characters). */
  name: string;
  /** Minutes of inactivity before the thread archives. */
  auto_archive_duration?: ThreadAutoArchiveDuration;
  /** Slowmode in seconds (0-21600). */
  rate_limit_per_user?: number;
}

/** First message of a forum or media post (OpenAPI ForumThreadMessageRequest). */
export interface APIForumThreadMessageRequest {
  content?: string | null;
  embeds?: unknown[];
  attachments?: unknown[];
  allowed_mentions?: unknown;
  flags?: number;
  sticker_ids?: Snowflake[] | null;
}

/** POST /channels/{id}/threads in a forum or media channel (OpenAPI StartForumThreadRequest). */
export interface APIStartForumThreadRequest {
  /** Post name (1-100 characters). */
  name: string;
  /** Always a public thread in a forum or media channel. */
  type?: ChannelType.PublicThread;
  auto_archive_duration?: ThreadAutoArchiveDuration;
  rate_limit_per_user?: number;
  /** Tag IDs applied to the post (max 5). */
  applied_tags?: Snowflake[];
  /** The first message of the post. */
  message: APIForumThreadMessageRequest;
}

/** Active or archived thread listing (OpenAPI ActiveThreadsResponse / ArchivedThreadsResponse). */
export interface APIThreadsListing {
  /** Threads in this page. */
  threads: import('./Channel.js').APIChannel[];
  /** Thread membership for each returned thread the current user has joined. */
  members: APIThreadMember[];
  /** Whether another page may exist. Absent on the active-thread listing. */
  has_more?: boolean;
}

/** GET /channels/{id}/threads/search success body (OpenAPI ThreadSearchResponse). */
export interface APIThreadSearchResponse extends APIThreadsListing {
  /** Whether a later request can return more threads. */
  has_more: boolean;
  /** Total threads matching the search. */
  total_results: number;
  /** First message of each returned post. Forum and media channels only. */
  first_messages?: import('./Message.js').APIMessage[];
}

/** Search index is still building (OpenAPI SearchIndexNotReadyResponse). */
export interface APISearchIndexNotReady {
  /** Always `SEARCH_INDEX_NOT_READY`. */
  code: 'SEARCH_INDEX_NOT_READY';
  /** Human-readable description. */
  message: string;
  /** Always 0 while the index is building. */
  documents_indexed: number;
  /** Seconds to wait before retrying. */
  retry_after: number;
}

/** PATCH /channels/{id}/thread-members/@me/settings. */
export interface APIThreadMemberSettingsRequest {
  /** Notification flags (see {@link ThreadMemberFlags}). */
  flags?: number;
  /** Whether the thread is muted. */
  muted?: boolean;
  /** Mute window. `null` clears it. */
  mute_config?: {
    end_time?: string | number | null;
    selected_time_window: number;
  } | null;
}

/** How thread search results are ordered (OpenAPI ThreadSearchSortBySchema). */
export type ThreadSearchSortBy =
  | 'last_message_time'
  | 'archive_time'
  | 'relevance'
  | 'creation_time';

/** Sort direction for thread search. */
export type ThreadSearchSortOrder = 'asc' | 'desc';
