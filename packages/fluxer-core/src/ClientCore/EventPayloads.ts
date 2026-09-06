import type { TextBasedChannel } from '../Domain/Channel/index.js';
import type { GuildEmoji } from '../Domain/Guild/GuildEmoji.js';
import type { GuildMember } from '../Domain/Guild/GuildMember.js';
import type { GuildSticker } from '../Domain/Guild/GuildSticker.js';
import type { Role } from '../Domain/Guild/Role.js';
import type { Message } from '../Domain/Message/index.js';
import type { MessageReaction } from '../Domain/Message/MessageReaction.js';
import type { PartialMessage } from '../Domain/Message/PartialMessage.js';
import type { User } from '../Domain/User.js';

/** CamelCase emoji on reaction events. */
export interface ReactionEmojiPayload {
  id?: string;
  name: string;
  animated?: boolean;
}

/**
 * Payload emitted for {@link Events.MessageReactionAdd} / {@link Events.MessageReactionRemove}.
 */
export interface MessageReactionPayload {
  reaction: MessageReaction;
  user: User;
  /** Cached message, or null if it was not in the message cache. Use `reaction.fetchMessage()` otherwise. */
  message: Message | null;
  /** Cached text-capable channel, or null if uncached / not text-based. */
  channel: TextBasedChannel | null;
  /** Cached reacting member when the gateway included one, otherwise null. */
  member: GuildMember | null;
  messageId: string;
  channelId: string;
  emoji: ReactionEmojiPayload;
  userId: string;
}

/**
 * Payload emitted for {@link Events.GuildRoleDelete}.
 */
export interface GuildRoleDeletePayload {
  roleId: string;
  guildId: string;
  role: Role | null;
}

/**
 * Payload emitted for {@link Events.MessageDeleteBulk}.
 * Normalized from `GatewayMessageDeleteBulkDispatchData`.
 */
export interface MessageDeleteBulkPayload {
  /** IDs of the deleted messages. */
  ids: string[];
  /** Channel from which the messages were deleted. */
  channelId: string;
  /** Guild the channel belongs to, or `null` for DMs. */
  guildId: string | null;
  /** Cached text-capable channel, or null if uncached / not text-based. */
  channel: TextBasedChannel | null;
  /**
   * One {@link PartialMessage} per id. Cached fields (content, author, createdAt) are
   * filled when the message was in cache; otherwise those fields are null.
   */
  messages: PartialMessage[];
}

/**
 * Payload emitted for {@link Events.InviteDelete}.
 * Normalized from `GatewayInviteDeleteDispatchData`.
 */
export interface InviteDeletePayload {
  /** Invite code that was deleted. */
  code: string;
  /** Guild the invite belonged to, or `null` for DMs / group DMs. */
  guildId: string | null;
  /** Channel the invite pointed to, or `null` if unknown. */
  channelId: string | null;
}

/**
 * Payload emitted for {@link Events.TypingStart}.
 * Normalized from `GatewayTypingStartDispatchData`.
 */
export interface TypingStartPayload {
  /** Channel where the user started typing. */
  channelId: string;
  /** Guild the channel belongs to, or `null` for DMs. */
  guildId: string | null;
  /** ID of the user who started typing. */
  userId: string;
  /** Unix timestamp (seconds) when typing began. */
  timestamp: number;
}

/**
 * Payload emitted for {@link Events.GuildEmojisUpdate}.
 * Contains the fully-cached {@link GuildEmoji} instances after the update.
 */
export interface GuildEmojisUpdatePayload {
  /** Guild whose emoji list changed. */
  guildId: string;
  /** Updated list of {@link GuildEmoji} instances (from cache). */
  emojis: GuildEmoji[];
}

/**
 * Payload emitted for {@link Events.GuildStickersUpdate}.
 * Contains cached {@link GuildSticker} instances after the update.
 */
export interface GuildStickersUpdatePayload {
  /** Guild whose sticker list changed. */
  guildId: string;
  /** Updated list of {@link GuildSticker} instances (from cache). */
  stickers: GuildSticker[];
}

/** Payload for {@link Events.MessageReactionRemoveAll}. */
export interface MessageReactionRemoveAllPayload {
  messageId: string;
  channelId: string;
  guildId: string | null;
  message: Message | null;
  channel: TextBasedChannel | null;
}

/** Payload for {@link Events.MessageReactionRemoveEmoji}. */
export interface MessageReactionRemoveEmojiPayload {
  messageId: string;
  channelId: string;
  guildId: string | null;
  emoji: ReactionEmojiPayload;
  message: Message | null;
  channel: TextBasedChannel | null;
}

/** Single entry in {@link MessageReactionAddManyPayload}. */
export interface MessageReactionAddManyEntry {
  userId: string;
  emoji: ReactionEmojiPayload;
  member: GuildMember | null;
}

/** Payload for {@link Events.MessageReactionAddMany}. */
export interface MessageReactionAddManyPayload {
  channelId: string;
  messageId: string;
  guildId: string | null;
  message: Message | null;
  channel: TextBasedChannel | null;
  reactions: MessageReactionAddManyEntry[];
}

/** Payload for {@link Events.ChannelPinsUpdate}. */
export interface ChannelPinsUpdatePayload {
  channelId: string;
  guildId: string | null;
  lastPinTimestamp: string | null;
}

/** Presence activity (camelCase). */
export interface PresenceActivity {
  name: string;
  type: number;
  url?: string | null;
}

/** Payload for {@link Events.PresenceUpdate}. */
export interface PresenceUpdatePayload {
  userId: string;
  guildId: string | null;
  status: string | null;
  activities: PresenceActivity[];
  customStatus: { text?: string | null; emojiId?: string | null; emojiName?: string | null } | null;
}

/** Payload for {@link Events.PresenceUpdateBulk}. */
export interface PresenceUpdateBulkPayload {
  guildId: string | null;
  presences: PresenceUpdatePayload[];
}

/** Payload for {@link Events.WebhooksUpdate}. */
export interface WebhooksUpdatePayload {
  channelId: string;
  guildId: string;
}

/** Payload for {@link Events.GuildMembersChunk}. */
export interface GuildMembersChunkPayload {
  guildId: string;
  members: GuildMember[];
  chunkIndex: number;
  chunkCount: number;
  notFound: string[];
  nonce: string | null;
}

/** Audit log change (camelCase). */
export interface AuditLogChange {
  key: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
}

/** Payload for {@link Events.GuildAuditLogEntryCreate} and audit fetch entries. */
export interface AuditLogEntryPayload {
  id: string;
  actionType: number;
  userId: string | null;
  targetId: string | null;
  reason: string | null;
  options: Record<string, string> | null;
  changes: AuditLogChange[];
  guildId: string | null;
}

/** Payload for {@link Events.GuildCountsUpdate}. */
export interface GuildCountsUpdatePayload {
  counts: Array<{ guildId: string; memberCount: number; onlineCount: number }>;
}

/** Payload for {@link Events.ChannelMemberCountsUpdate}. */
export interface ChannelMemberCountsUpdatePayload {
  counts: Array<{
    guildId: string;
    channelId: string;
    memberCount: number;
    onlineCount: number;
  }>;
}

/** Role update with optional previous snapshot. */
export interface GuildRoleUpdatePayload {
  /** Role after the update (cached instance). */
  role: Role;
  /** Shallow previous field snapshot when the role was already cached. */
  oldRole: Role | null;
}

/** Vanity URL result (camelCase). */
export interface VanityURLPayload {
  code: string | null;
  uses: number;
}

/** Result of {@link Guild.fetchAuditLogs}. */
export interface AuditLogFetchPayload {
  entries: AuditLogEntryPayload[];
  users: User[];
}

/** Guild member search result row (camelCase). */
export interface GuildMemberSearchHit {
  id: string;
  guildId: string;
  userId: string;
  username: string;
  discriminator: string;
  globalName: string | null;
  nickname: string | null;
  /** Cached {@link GuildMember} when available after search hydration. */
  member: GuildMember | null;
}

/** Guild member search response (camelCase). */
export interface GuildMemberSearchPayload {
  guildId: string;
  members: GuildMemberSearchHit[];
  /** Total matches across pages (`total_result_count`). */
  total?: number;
  /** Results on this page (`page_result_count`). */
  pageResultCount?: number;
  /** Whether more pages exist after this offset. */
  hasMore?: boolean;
  /** Search index still building. */
  indexing?: boolean;
}

/** Partial guild from GET /users/@me/guilds. */
export interface PartialUserGuildPayload {
  id: string;
  name: string;
  icon: string | null;
  owner?: boolean;
  permissions?: string | null;
  features?: string[];
  /** Present when fetched with `{ withCounts: true }`. */
  approximateMemberCount?: number;
  /** Present when fetched with `{ withCounts: true }`. */
  approximatePresenceCount?: number;
}

/** Payload for {@link Events.ChannelRecipientAdd} / {@link Events.ChannelRecipientRemove}. */
export interface ChannelRecipientPayload {
  channelId: string;
  user: User;
}

/** Re-export for presence user convenience. */
export type { User };
