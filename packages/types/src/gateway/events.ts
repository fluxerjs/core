/**
 * Gateway dispatch event names sent by the Fluxer gateway.
 * Sourced from fluxer_gateway constants.erl. Use for type-safe event handling.
 *
 * @example
 * ```ts
 * if (payload.t === GatewayDispatchEvents.MessageCreate) {
 *   // handle message
 * }
 * ```
 */
export const GatewayDispatchEvents = {
  // ─── Connection & Session ─────────────────────────────────────────────────
  /** Initial connection established; contains user, guilds, and session state. */
  Ready: 'READY',
  /** Connection resumed after disconnect; sequence restored. */
  Resumed: 'RESUMED',
  /** User's active sessions list replaced (e.g. new login). */
  SessionsReplace: 'SESSIONS_REPLACE',

  // ─── User ──────────────────────────────────────────────────────────────────
  /** Current user's profile was updated. */
  UserUpdate: 'USER_UPDATE',
  /** User settings changed (theme, locale, etc.). */
  UserSettingsUpdate: 'USER_SETTINGS_UPDATE',
  /** Per-guild user settings changed (notifications, etc.). */
  UserGuildSettingsUpdate: 'USER_GUILD_SETTINGS_UPDATE',
  /** Pinned DM order changed. */
  UserPinnedDmsUpdate: 'USER_PINNED_DMS_UPDATE',
  /** Note on another user changed. */
  UserNoteUpdate: 'USER_NOTE_UPDATE',
  /** Recent mention was cleared. */
  RecentMentionDelete: 'RECENT_MENTION_DELETE',

  // ─── Saved Messages & Auth ─────────────────────────────────────────────────
  /** Message was saved (bookmarked). */
  SavedMessageCreate: 'SAVED_MESSAGE_CREATE',
  /** Saved message was unsaved. */
  SavedMessageDelete: 'SAVED_MESSAGE_DELETE',
  /** Auth session changed (login/logout on another client). */
  AuthSessionChange: 'AUTH_SESSION_CHANGE',

  // ─── Presence ───────────────────────────────────────────────────────────────
  /** User's presence (status, activity) updated. */
  PresenceUpdate: 'PRESENCE_UPDATE',

  // ─── Guild ─────────────────────────────────────────────────────────────────
  /** Bot joined a guild or guild data became available. */
  GuildCreate: 'GUILD_CREATE',
  /** Guild was updated. */
  GuildUpdate: 'GUILD_UPDATE',
  /** Bot left or was removed from a guild. */
  GuildDelete: 'GUILD_DELETE',
  /** Member joined a guild. */
  GuildMemberAdd: 'GUILD_MEMBER_ADD',
  /** Member was updated (roles, nickname, etc.). */
  GuildMemberUpdate: 'GUILD_MEMBER_UPDATE',
  /** Member left or was removed from a guild. */
  GuildMemberRemove: 'GUILD_MEMBER_REMOVE',
  /** Chunk of guild members (from request_guild_members). */
  GuildMembersChunk: 'GUILD_MEMBERS_CHUNK',
  /** Member list view updated (lazy loading). */
  GuildMemberListUpdate: 'GUILD_MEMBER_LIST_UPDATE',
  /** Guild sync state (passive/lazy loading). */
  GuildSync: 'GUILD_SYNC',

  // ─── Roles ──────────────────────────────────────────────────────────────────
  /** Role was created. */
  GuildRoleCreate: 'GUILD_ROLE_CREATE',
  /** Role was updated. */
  GuildRoleUpdate: 'GUILD_ROLE_UPDATE',
  /** Multiple roles updated at once. */
  GuildRoleUpdateBulk: 'GUILD_ROLE_UPDATE_BULK',
  /** Role was deleted. */
  GuildRoleDelete: 'GUILD_ROLE_DELETE',

  // ─── Guild Assets ───────────────────────────────────────────────────────────
  /** Guild emojis changed. */
  GuildEmojisUpdate: 'GUILD_EMOJIS_UPDATE',
  /** Guild stickers changed. */
  GuildStickersUpdate: 'GUILD_STICKERS_UPDATE',

  // ─── Moderation ─────────────────────────────────────────────────────────────
  /** User was banned from a guild. */
  GuildBanAdd: 'GUILD_BAN_ADD',
  /** User was unbanned from a guild. */
  GuildBanRemove: 'GUILD_BAN_REMOVE',

  // ─── Channels ──────────────────────────────────────────────────────────────
  /** Channel was created. */
  ChannelCreate: 'CHANNEL_CREATE',
  /** Channel was updated. */
  ChannelUpdate: 'CHANNEL_UPDATE',
  /** Multiple channels updated at once. */
  ChannelUpdateBulk: 'CHANNEL_UPDATE_BULK',
  /** Channel was deleted. */
  ChannelDelete: 'CHANNEL_DELETE',
  /** Recipient added to group DM. */
  ChannelRecipientAdd: 'CHANNEL_RECIPIENT_ADD',
  /** Recipient removed from group DM. */
  ChannelRecipientRemove: 'CHANNEL_RECIPIENT_REMOVE',
  /** Pinned messages in a channel changed. */
  ChannelPinsUpdate: 'CHANNEL_PINS_UPDATE',
  /** User acknowledged viewing pinned messages. */
  ChannelPinsAck: 'CHANNEL_PINS_ACK',

  // ─── Internal / Passive ────────────────────────────────────────────────────
  /** Passive/lazy-loaded entity updates. */
  PassiveUpdates: 'PASSIVE_UPDATES',

  // ─── Invites ───────────────────────────────────────────────────────────────
  /** Invite was created. */
  InviteCreate: 'INVITE_CREATE',
  /** Invite was deleted or expired. */
  InviteDelete: 'INVITE_DELETE',

  // ─── Messages ──────────────────────────────────────────────────────────────
  /** New message was sent. */
  MessageCreate: 'MESSAGE_CREATE',
  /** Message was edited. */
  MessageUpdate: 'MESSAGE_UPDATE',
  /** Message was deleted. */
  MessageDelete: 'MESSAGE_DELETE',
  /** Multiple messages were deleted. */
  MessageDeleteBulk: 'MESSAGE_DELETE_BULK',
  /** Reaction was added to a message. */
  MessageReactionAdd: 'MESSAGE_REACTION_ADD',
  /** Reaction was removed from a message. */
  MessageReactionRemove: 'MESSAGE_REACTION_REMOVE',
  /** All reactions were removed from a message. */
  MessageReactionRemoveAll: 'MESSAGE_REACTION_REMOVE_ALL',
  /** All reactions of an emoji were removed from a message. */
  MessageReactionRemoveEmoji: 'MESSAGE_REACTION_REMOVE_EMOJI',
  /** Message was acknowledged (read receipt). */
  MessageAck: 'MESSAGE_ACK',

  // ─── Typing ─────────────────────────────────────────────────────────────────
  /** User started typing in a channel. */
  TypingStart: 'TYPING_START',

  // ─── Webhooks ───────────────────────────────────────────────────────────────
  /** Webhooks for a channel were updated. */
  WebhooksUpdate: 'WEBHOOKS_UPDATE',

  // ─── Relationships ──────────────────────────────────────────────────────────
  /** Relationship (friend, block) was added. */
  RelationshipAdd: 'RELATIONSHIP_ADD',
  /** Relationship was updated. */
  RelationshipUpdate: 'RELATIONSHIP_UPDATE',
  /** Relationship was removed. */
  RelationshipRemove: 'RELATIONSHIP_REMOVE',

  // ─── Voice ───────────────────────────────────────────────────────────────────
  /** Voice state changed (join, leave, mute, etc.). */
  VoiceStateUpdate: 'VOICE_STATE_UPDATE',
  /** Voice server allocation info (for connecting to voice). */
  VoiceServerUpdate: 'VOICE_SERVER_UPDATE',

  // ─── Calls ──────────────────────────────────────────────────────────────────
  /** Call was created. */
  CallCreate: 'CALL_CREATE',
  /** Call was updated. */
  CallUpdate: 'CALL_UPDATE',
  /** Call was ended. */
  CallDelete: 'CALL_DELETE',

  // ─── Favorites ──────────────────────────────────────────────────────────────
  /** Favorite meme/media was added. */
  FavoriteMemeCreate: 'FAVORITE_MEME_CREATE',
  /** Favorite meme/media was updated. */
  FavoriteMemeUpdate: 'FAVORITE_MEME_UPDATE',
  /** Favorite meme/media was removed. */
  FavoriteMemeDelete: 'FAVORITE_MEME_DELETE',

  // ─── SDK / Compatibility (may come from API layer) ──────────────────────────
  /** Slash command or component interaction. */
  InteractionCreate: 'INTERACTION_CREATE',
  /** Guild integrations changed. */
  GuildIntegrationsUpdate: 'GUILD_INTEGRATIONS_UPDATE',
  /** Guild scheduled event was created. */
  GuildScheduledEventCreate: 'GUILD_SCHEDULED_EVENT_CREATE',
  /** Guild scheduled event was updated. */
  GuildScheduledEventUpdate: 'GUILD_SCHEDULED_EVENT_UPDATE',
  /** Guild scheduled event was cancelled. */
  GuildScheduledEventDelete: 'GUILD_SCHEDULED_EVENT_DELETE',
} as const;

export type GatewayDispatchEventName =
  (typeof GatewayDispatchEvents)[keyof typeof GatewayDispatchEvents];
