import type { Snowflake } from '../Common/Snowflake.js';

/**
 * REST path helpers. Most paths are `/v{version}`-relative; it is not an HTTP client.
 * {@link Routes.instanceDiscovery} is unversioned (`GET /.well-known/fluxer` on the origin).
 * Pass the result to {@link REST} (`client.rest`). Prefer high-level helpers
 * (`channel.send()`, `guild.members.fetch()`) when they exist.
 *
 * @example
 * const channel = await client.rest.get(Client.Routes.channel(channelId));
 *
 * @example
 * await client.rest.post(Client.Routes.channelMessages(channelId), {
 *   body: { content: 'hello' },
 * });
 *
 * @see {@link REST}
 * @see {@link Client}
 * @see {@link /rest/ REST API reference}
 */
export const Routes = {
  // Channels
  channel: (id: Snowflake) => `/channels/${id}` as const,
  channelMessages: (id: Snowflake) => `/channels/${id}/messages` as const,
  channelMessage: (channelId: Snowflake, messageId: Snowflake) =>
    `/channels/${channelId}/messages/${messageId}` as const,
  channelMessageReactions: (channelId: Snowflake, messageId: Snowflake) =>
    `/channels/${channelId}/messages/${messageId}/reactions` as const,
  channelMessageReaction: (channelId: Snowflake, messageId: Snowflake, emoji: string) =>
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}` as const,
  channelMessageReactionMe: (channelId: Snowflake, messageId: Snowflake, emoji: string) =>
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me` as const,
  channelMessageReactionUsers: (channelId: Snowflake, messageId: Snowflake, emoji: string) =>
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/users` as const,
  channelMessageReactionUser: (
    channelId: Snowflake,
    messageId: Snowflake,
    emoji: string,
    userId: Snowflake,
  ) =>
    `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/${userId}` as const,
  channelPins: (id: Snowflake) => `/channels/${id}/messages/pins` as const,
  /** Pin/unpin: PUT or DELETE /channels/{id}/pins/{messageId}. */
  channelPinMessage: (channelId: Snowflake, messageId: Snowflake) =>
    `/channels/${channelId}/pins/${messageId}` as const,
  channelBulkDelete: (id: Snowflake) => `/channels/${id}/messages/bulk-delete` as const,
  channelBulkDeleteMine: (id: Snowflake) => `/channels/${id}/messages/bulk-delete-mine` as const,
  channelMessagesAck: (id: Snowflake) => `/channels/${id}/messages/ack` as const,
  channelMessagesPurge: (id: Snowflake) => `/channels/${id}/messages/purge` as const,
  channelPinsAck: (id: Snowflake) => `/channels/${id}/pins/ack` as const,
  channelAttachments: (id: Snowflake) => `/channels/${id}/attachments` as const,
  channelAttachmentsComplete: (id: Snowflake) => `/channels/${id}/attachments/complete` as const,
  /** POST /channels/messages/bulk — multi-channel message fetch */
  channelsMessagesBulk: () => `/channels/messages/bulk` as const,
  channelWebhooks: (id: Snowflake) => `/channels/${id}/webhooks` as const,
  channelTyping: (id: Snowflake) => `/channels/${id}/typing` as const,
  channelRtcRegions: (id: Snowflake) => `/channels/${id}/rtc-regions` as const,
  channelSlowmode: (id: Snowflake) => `/channels/${id}/slowmode` as const,
  channelInvites: (id: Snowflake) => `/channels/${id}/invites` as const,
  channelPermission: (channelId: Snowflake, overwriteId: Snowflake) =>
    `/channels/${channelId}/permissions/${overwriteId}` as const,
  channelRecipient: (channelId: Snowflake, userId: Snowflake) =>
    `/channels/${channelId}/recipients/${userId}` as const,
  channelMessageAttachment: (channelId: Snowflake, messageId: Snowflake, attachmentId: Snowflake) =>
    `/channels/${channelId}/messages/${messageId}/attachments/${attachmentId}` as const,
  /** POST /channels/{id}/threads — start a thread, or a forum/media post. */
  channelThreads: (id: Snowflake) => `/channels/${id}/threads` as const,
  /** POST /channels/{id}/messages/{messageId}/threads — start a thread from a message. */
  channelMessageThreads: (channelId: Snowflake, messageId: Snowflake) =>
    `/channels/${channelId}/messages/${messageId}/threads` as const,
  /** GET archived public threads in a channel. */
  channelThreadsArchivedPublic: (id: Snowflake) =>
    `/channels/${id}/threads/archived/public` as const,
  /** GET archived private threads in a channel. */
  channelThreadsArchivedPrivate: (id: Snowflake) =>
    `/channels/${id}/threads/archived/private` as const,
  /** GET private archived threads the current user has joined. */
  channelJoinedArchivedPrivateThreads: (id: Snowflake) =>
    `/channels/${id}/users/@me/threads/archived/private` as const,
  /** GET /channels/{id}/threads/search. */
  channelThreadSearch: (id: Snowflake) => `/channels/${id}/threads/search` as const,
  /** GET /channels/{id}/thread-members. */
  channelThreadMembers: (id: Snowflake) => `/channels/${id}/thread-members` as const,
  /** PUT join or DELETE leave: /channels/{id}/thread-members/@me. */
  channelThreadMemberMe: (id: Snowflake) => `/channels/${id}/thread-members/@me` as const,
  /** PATCH /channels/{id}/thread-members/@me/settings. */
  channelThreadMemberMeSettings: (id: Snowflake) =>
    `/channels/${id}/thread-members/@me/settings` as const,
  /** GET, PUT, or DELETE one thread member. */
  channelThreadMember: (channelId: Snowflake, userId: Snowflake) =>
    `/channels/${channelId}/thread-members/${userId}` as const,
  /** POST /channels/{id}/tags — create a forum or media tag. */
  channelTags: (id: Snowflake) => `/channels/${id}/tags` as const,
  /** PUT or DELETE /channels/{id}/tags/{tagId}. */
  channelTag: (channelId: Snowflake, tagId: Snowflake) =>
    `/channels/${channelId}/tags/${tagId}` as const,

  // Guilds
  guilds: () => '/guilds' as const,
  guild: (id: Snowflake) => `/guilds/${id}` as const,
  guildDelete: (guildId: Snowflake) => `/guilds/${guildId}/delete` as const,
  guildVanityUrl: (guildId: Snowflake) => `/guilds/${guildId}/vanity-url` as const,
  guildTransferOwnership: (guildId: Snowflake) => `/guilds/${guildId}/transfer-ownership` as const,
  guildRolesHoistPositions: (guildId: Snowflake) =>
    `/guilds/${guildId}/roles/hoist-positions` as const,
  guildEmojisBulk: (guildId: Snowflake) => `/guilds/${guildId}/emojis/bulk` as const,
  guildEmojisClone: (guildId: Snowflake) => `/guilds/${guildId}/emojis/clone` as const,
  guildStickersBulk: (guildId: Snowflake) => `/guilds/${guildId}/stickers/bulk` as const,
  guildStickersClone: (guildId: Snowflake) => `/guilds/${guildId}/stickers/clone` as const,
  guildDiscovery: (guildId: Snowflake) => `/guilds/${guildId}/discovery` as const,
  guildChannels: (id: Snowflake) => `/guilds/${id}/channels` as const,
  /** GET /guilds/{id}/threads/active — active threads in the guild. */
  guildActiveThreads: (id: Snowflake) => `/guilds/${id}/threads/active` as const,
  guildMembers: (id: Snowflake) => `/guilds/${id}/members` as const,
  guildMembersSearch: (id: Snowflake) => `/guilds/${id}/members-search` as const,
  guildMember: (guildId: Snowflake, userId: Snowflake) =>
    `/guilds/${guildId}/members/${userId}` as const,
  guildMemberMe: (guildId: Snowflake) => `/guilds/${guildId}/members/@me` as const,
  guildMemberRole: (guildId: Snowflake, userId: Snowflake, roleId: Snowflake) =>
    `/guilds/${guildId}/members/${userId}/roles/${roleId}` as const,
  guildRoles: (id: Snowflake) => `/guilds/${id}/roles` as const,
  guildRole: (guildId: Snowflake, roleId: Snowflake) =>
    `/guilds/${guildId}/roles/${roleId}` as const,
  guildBans: (id: Snowflake) => `/guilds/${id}/bans` as const,
  guildBan: (guildId: Snowflake, userId: Snowflake) => `/guilds/${guildId}/bans/${userId}` as const,
  guildInvites: (id: Snowflake) => `/guilds/${id}/invites` as const,
  invite: (code: string) => `/invites/${encodeURIComponent(code)}` as const,
  guildAuditLogs: (id: Snowflake) => `/guilds/${id}/audit-logs` as const,
  guildEmojis: (id: Snowflake) => `/guilds/${id}/emojis` as const,
  guildEmoji: (guildId: Snowflake, emojiId: Snowflake) =>
    `/guilds/${guildId}/emojis/${emojiId}` as const,
  guildStickers: (id: Snowflake) => `/guilds/${id}/stickers` as const,
  guildSticker: (guildId: Snowflake, stickerId: Snowflake) =>
    `/guilds/${guildId}/stickers/${stickerId}` as const,
  guildWebhooks: (id: Snowflake) => `/guilds/${id}/webhooks` as const,
  webhook: (id: Snowflake) => `/webhooks/${id}` as const,
  webhookExecute: (id: Snowflake, token: string) => `/webhooks/${id}/${token}` as const,
  webhookMessage: (id: Snowflake, token: string, messageId: Snowflake) =>
    `/webhooks/${id}/${token}/messages/${messageId}` as const,

  // Users
  user: (id: Snowflake) => `/users/${id}` as const,
  currentUser: () => `/users/@me` as const,
  currentUserGuilds: () => `/users/@me/guilds` as const,
  leaveGuild: (guildId: Snowflake) => `/users/@me/guilds/${guildId}` as const,
  guildBulkDeleteMine: (guildId: Snowflake) =>
    `/users/@me/guilds/${guildId}/messages/bulk-delete-mine` as const,
  userMeChannels: () => `/users/@me/channels` as const,
  userMeChannelPin: (channelId: Snowflake) => `/users/@me/channels/${channelId}/pin` as const,
  /** GET /users/{id}/profile. Pass guildId for server-specific profile. */
  userProfile: (id: Snowflake, guildId?: Snowflake): string =>
    guildId ? `/users/${id}/profile?guild_id=${guildId}` : `/users/${id}/profile`,

  // Instance (unauthenticated, unversioned on the given origin)
  /**
   * Canonical instance discovery document (`GET /.well-known/fluxer`).
   * Unversioned: request as an absolute `{origin}/.well-known/fluxer` URL, or with REST `unversioned: true`.
   * Do not prefix `/v1`.
   */
  instanceDiscovery: () => '/.well-known/fluxer' as const,

  // Gateway
  gatewayBot: () => `/gateway/bot` as const,

  // Applications & discovery helpers
  applicationsMe: () => '/applications/@me' as const,
  oauth2ApplicationsMe: () => '/oauth2/applications/@me' as const,
  emojiMetadata: (emojiId: Snowflake) => `/emojis/${emojiId}/metadata` as const,
  stickerMetadata: (stickerId: Snowflake) => `/stickers/${stickerId}/metadata` as const,
  checkUsernameTag: () => '/users/check-tag' as const,
  preloadMessages: () => '/users/@me/preload-messages' as const,
  preloadMessagesAlt: () => '/users/@me/channels/messages/preload' as const,
  searchMessages: () => '/search/messages' as const,

  // Streams (voice channel screen share preview)
  streamPreview: (streamKey: string) =>
    `/streams/${encodeURIComponent(streamKey)}/preview` as const,

  // OAuth2 / Bot
  oauth2ApplicationBot: (id: Snowflake) => `/oauth2/applications/${id}/bot` as const,
  oauth2ApplicationBotResetToken: (id: Snowflake) =>
    `/oauth2/applications/${id}/bot/reset-token` as const,
} as const;
