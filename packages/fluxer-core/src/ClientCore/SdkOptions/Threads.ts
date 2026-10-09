/** Thread create / edit / search options and wire bodies. */

import {
  ChannelType,
  type ForumLayout,
  type ForumSortOrder,
  type ForumTagSetting,
  type ThreadAutoArchiveDuration,
} from '@fluxerjs/types';
import type { MessagePrepareInput, SendBodyResult } from '../../Helpers/MessageUtils/index.js';
import type { ChannelEditOptions } from './Channels.js';

/** Parent-channel defaults copied onto new threads. */
export interface ThreadParentEditOptions {
  /** Minutes of inactivity before new threads archive. `null` clears the default. */
  autoArchiveDuration?: ThreadAutoArchiveDuration | null;
  /** Slowmode in seconds copied onto new threads (0-21600). `null` clears it. */
  rateLimitPerUser?: number | null;
  /** Audit log reason (`X-Audit-Log-Reason`). Not sent in the JSON body. */
  reason?: string;
}

/** Options for {@link ThreadChannel.edit}. */
export interface ThreadEditOptions {
  /** Thread name (1-100 characters). */
  name?: string;
  /** Archive or unarchive the thread. */
  archived?: boolean | null;
  /** Minutes of inactivity before the thread archives. */
  autoArchiveDuration?: ThreadAutoArchiveDuration;
  /** When true, only moderators can unarchive the thread. */
  locked?: boolean | null;
  /** Slowmode in seconds (0-21600). */
  rateLimitPerUser?: number | null;
  /** Channel flags bitfield. */
  flags?: number;
  /** Tag IDs on a public forum or media post (max 5). */
  appliedTags?: string[];
  /** Whether non-moderators can add other non-moderators. Private threads only. */
  invitable?: boolean | null;
  /** Audit log reason (`X-Audit-Log-Reason`). Not sent in the JSON body. */
  reason?: string;
}

/** Options for starting a thread in a text or announcement channel. */
export interface StartThreadOptions {
  /** Thread name (1-100 characters). */
  name: string;
  /**
   * Public, private, or announcement thread.
   * Defaults to an announcement thread in announcement channels and a public thread elsewhere.
   */
  type?: ChannelType.AnnouncementThread | ChannelType.PublicThread | ChannelType.PrivateThread;
  /** Minutes of inactivity before the thread archives. */
  autoArchiveDuration?: ThreadAutoArchiveDuration;
  /** Slowmode in seconds (0-21600). */
  rateLimitPerUser?: number;
  /** Whether non-moderators can add other non-moderators. Private threads only. */
  invitable?: boolean;
  /** Audit log reason (`X-Audit-Log-Reason`). Not sent in the JSON body. */
  reason?: string;
}

/** Options for starting a thread from an existing message. */
export interface StartThreadFromMessageOptions {
  /** Thread name (1-100 characters). */
  name: string;
  autoArchiveDuration?: ThreadAutoArchiveDuration;
  rateLimitPerUser?: number;
  /** Audit log reason (`X-Audit-Log-Reason`). Not sent in the JSON body. */
  reason?: string;
}

/**
 * Options for creating a post in a forum or media channel.
 * The post is a public thread whose first message is {@link message}.
 */
export interface StartForumThreadOptions {
  /** Post name (1-100 characters). */
  name: string;
  /** First message of the post. */
  message: MessagePrepareInput;
  autoArchiveDuration?: ThreadAutoArchiveDuration;
  rateLimitPerUser?: number;
  /** Tag IDs applied to the post (max 5). */
  appliedTags?: string[];
  /** Audit log reason (`X-Audit-Log-Reason`). Not sent in the JSON body. */
  reason?: string;
}

/** Options for listing archived threads. `before` is an ISO-8601 archive timestamp. */
export interface FetchArchivedThreadsOptions {
  /** Public or private archived threads. */
  type: 'public' | 'private';
  /** Return threads archived before this ISO-8601 timestamp. */
  before?: string;
  /** Page size (2-100). Defaults to 50. */
  limit?: number;
}

/** Options for listing joined private archived threads. `before` is a thread snowflake. */
export interface FetchJoinedArchivedThreadsOptions {
  /** Return threads before this thread ID. */
  before?: string;
  /** Page size (2-100). Defaults to 50. */
  limit?: number;
}

/** Options for GET /channels/{id}/threads/search. */
export interface ThreadSearchOptions {
  /** Text to look for in thread names (max 100 characters). */
  name?: string;
  /** Tag IDs to filter by (max 20). */
  tag?: string[];
  /** How several tags are combined. */
  tagSetting?: ForumTagSetting;
  /** `true` returns only archived threads. `false` returns only active threads. */
  archived?: boolean;
  sortBy?: 'last_message_time' | 'archive_time' | 'relevance' | 'creation_time';
  sortOrder?: 'asc' | 'desc';
  /** Page size (1-25). Defaults to 25. */
  limit?: number;
  /** Number of threads to skip (max 9975). */
  offset?: number;
  /** Return threads before this thread ID. */
  maxId?: string;
  /** Return threads after this thread ID. */
  minId?: string;
}

/** Options for listing thread members. */
export interface FetchThreadMembersOptions {
  /** Include a guild member object for each thread member. */
  withMember?: boolean;
  /** Return members after this user ID. */
  after?: string;
  /** Page size (1-100). Defaults to 100. */
  limit?: number;
}

/** Options for the current user's thread notification settings. */
export interface ThreadMemberSettingsOptions {
  /** Notification flags. See {@link import('@fluxerjs/types').ThreadMemberFlags}. */
  flags?: number;
  /** Whether the thread is muted. */
  muted?: boolean;
  /**
   * Mute window. `null` clears it.
   * `selectedTimeWindow` is the duration in seconds.
   */
  muteConfig?: { endTime?: string | number | null; selectedTimeWindow: number } | null;
}

/** One tag in a forum or media channel's tag list. Include `id` to keep an existing tag. */
export interface ForumAvailableTag {
  /** Existing tag ID. Omit to create the tag as part of the list. */
  id?: string;
  /** Tag name (1-50 characters). */
  name: string;
  /** Whether only moderators can apply or remove this tag. */
  moderated?: boolean;
  /** Custom guild emoji ID. `null` clears it. */
  emojiId?: string | null;
  /** Unicode emoji. `null` clears it. */
  emojiName?: string | null;
}

/** Default reaction shown on new forum or media posts. */
export interface DefaultReactionEmojiInput {
  /** Custom guild emoji ID. `null` clears it. */
  emojiId?: string | null;
  /** Unicode emoji. `null` clears it. */
  emojiName?: string | null;
}

/**
 * Forum and media settings.
 * `defaultForumLayout` is sent only for forum channels.
 */
export interface ForumParentFields {
  /** Tags that can be applied to posts (max 20). Replaces the whole list. */
  availableTags?: ForumAvailableTag[];
  /** Default reaction for new posts. `null` clears it. */
  defaultReactionEmoji?: DefaultReactionEmojiInput | null;
  /** Default sort order for posts. `null` clears it. */
  defaultSortOrder?: ForumSortOrder | null;
  /** How posts match when several tags are selected. `null` clears it. */
  defaultTagSetting?: ForumTagSetting | null;
  /** Channel flags bitfield. */
  flags?: number;
  /** Minutes of inactivity before new posts archive. `null` clears the default. */
  defaultAutoArchiveDuration?: ThreadAutoArchiveDuration | null;
  /** Slowmode in seconds copied onto new posts (0-21600). `null` clears it. */
  defaultThreadRateLimitPerUser?: number | null;
  /** Default layout for forum posts. Ignored on media channels. `null` clears it. */
  defaultForumLayout?: ForumLayout | null;
}

/** Options for {@link ForumChannel.edit} and {@link MediaChannel.edit}. */
export interface ForumParentEditOptions extends ChannelEditOptions, ForumParentFields {}

/** Create or edit a forum/media tag. */
export interface ForumTagOptions {
  /** Tag name (1-50 characters). */
  name: string;
  /** Whether only moderators can apply or remove this tag. */
  moderated?: boolean;
  /** Custom guild emoji ID. `null` clears it. */
  emojiId?: string | null;
  /** Unicode emoji. `null` clears it. */
  emojiName?: string | null;
  /** Audit log reason (`X-Audit-Log-Reason`). Not sent in the JSON body. */
  reason?: string;
}

/** Wire body for PATCH of a thread channel. */
export function toThreadEditBody(
  type: ChannelType,
  options: ThreadEditOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.name !== undefined) body.name = options.name;
  if (options.archived !== undefined) body.archived = options.archived;
  if (options.autoArchiveDuration !== undefined) {
    body.auto_archive_duration = options.autoArchiveDuration;
  }
  if (options.locked !== undefined) body.locked = options.locked;
  if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;
  if (options.flags !== undefined) body.flags = options.flags;
  if (options.appliedTags !== undefined && type !== ChannelType.PrivateThread) {
    body.applied_tags = options.appliedTags;
  }
  if (options.invitable !== undefined && type === ChannelType.PrivateThread) {
    body.invitable = options.invitable;
  }
  return body;
}

/** Wire body for PATCH of parent-channel thread defaults. */
export function toThreadParentEditBody(options: ThreadParentEditOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.autoArchiveDuration !== undefined) {
    body.default_auto_archive_duration = options.autoArchiveDuration;
  }
  if (options.rateLimitPerUser !== undefined) {
    body.default_thread_rate_limit_per_user = options.rateLimitPerUser;
  }
  return body;
}

/** Wire body for POST /channels/{id}/threads in a text or announcement channel. */
export function toStartThreadBody(
  channelType: ChannelType,
  options: StartThreadOptions,
): Record<string, unknown> {
  const type =
    options.type ??
    (channelType === ChannelType.GuildAnnouncement
      ? ChannelType.AnnouncementThread
      : ChannelType.PublicThread);
  const body: Record<string, unknown> = { name: options.name, type };
  if (options.autoArchiveDuration !== undefined) {
    body.auto_archive_duration = options.autoArchiveDuration;
  }
  if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;
  if (options.invitable !== undefined) body.invitable = options.invitable;
  return body;
}

/** Wire body for POST /channels/{id}/messages/{id}/threads. */
export function toStartThreadFromMessageBody(
  options: StartThreadFromMessageOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = { name: options.name };
  if (options.autoArchiveDuration !== undefined) {
    body.auto_archive_duration = options.autoArchiveDuration;
  }
  if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;
  return body;
}

/** Fields from a prepared message that a forum post starter accepts. */
export function toForumThreadMessage(body: SendBodyResult): Record<string, unknown> {
  const message: Record<string, unknown> = {};
  if (body.content !== undefined) message.content = body.content;
  if (body.embeds !== undefined) message.embeds = body.embeds;
  if (body.attachments !== undefined) message.attachments = body.attachments;
  if (body.allowed_mentions !== undefined) message.allowed_mentions = body.allowed_mentions;
  if (body.flags !== undefined) message.flags = body.flags;
  if (body.sticker_ids !== undefined) message.sticker_ids = body.sticker_ids;
  return message;
}

/** Wire body for a forum or media tag. */
export function toForumTagBody(
  options: ForumTagOptions | ForumAvailableTag,
): Record<string, unknown> {
  const body: Record<string, unknown> = { name: options.name };
  if ('id' in options && options.id !== undefined) body.id = options.id;
  if (options.moderated !== undefined) body.moderated = options.moderated;
  if (options.emojiId !== undefined) body.emoji_id = options.emojiId;
  if (options.emojiName !== undefined) body.emoji_name = options.emojiName;
  return body;
}

/** Forum and media fields for a channel create or edit body. Layout is forum-only. */
export function forumParentWire(
  options: ForumParentFields,
  includeLayout: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.availableTags !== undefined) {
    body.available_tags = options.availableTags.map((tag) => toForumTagBody(tag));
  }
  if (options.defaultReactionEmoji !== undefined) {
    body.default_reaction_emoji =
      options.defaultReactionEmoji === null
        ? null
        : reactionEmojiWire(options.defaultReactionEmoji);
  }
  if (options.defaultSortOrder !== undefined) body.default_sort_order = options.defaultSortOrder;
  if (options.defaultTagSetting !== undefined) body.default_tag_setting = options.defaultTagSetting;
  if (options.flags !== undefined) body.flags = options.flags;
  if (options.defaultAutoArchiveDuration !== undefined) {
    body.default_auto_archive_duration = options.defaultAutoArchiveDuration;
  }
  if (options.defaultThreadRateLimitPerUser !== undefined) {
    body.default_thread_rate_limit_per_user = options.defaultThreadRateLimitPerUser;
  }
  if (includeLayout && options.defaultForumLayout !== undefined) {
    body.default_forum_layout = options.defaultForumLayout;
  }
  return body;
}

function reactionEmojiWire(emoji: DefaultReactionEmojiInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (emoji.emojiId !== undefined) body.emoji_id = emoji.emojiId;
  if (emoji.emojiName !== undefined) body.emoji_name = emoji.emojiName;
  return body;
}

/** Wire body for the current user's thread settings. */
export function toThreadMemberSettingsBody(
  options: ThreadMemberSettingsOptions,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.flags !== undefined) body.flags = options.flags;
  if (options.muted !== undefined) body.muted = options.muted;
  if (options.muteConfig !== undefined) {
    body.mute_config =
      options.muteConfig === null
        ? null
        : {
            ...(options.muteConfig.endTime !== undefined
              ? { end_time: options.muteConfig.endTime }
              : {}),
            selected_time_window: options.muteConfig.selectedTimeWindow,
          };
  }
  return body;
}

/** Append defined query params. Repeated keys use `append`. */
export function withQuery(
  path: string,
  params: Record<string, string | number | boolean | readonly string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
      continue;
    }
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
