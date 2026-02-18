import type { Snowflake } from '../common/snowflake.js';

/**
 * Route builder helpers for REST API.
 * All routes are relative to /v1
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
  channelPins: (id: Snowflake) => `/channels/${id}/messages/pins` as const,
  /** Use channelPinMessage for PUT/DELETE pin operations. */
  channelPin: (channelId: Snowflake, messageId: Snowflake) =>
    `/channels/${channelId}/messages/pins/${messageId}` as const,
  /** Pin/unpin: PUT or DELETE /channels/{id}/pins/{messageId}. Use for pin and unpin operations. */
  channelPinMessage: (channelId: Snowflake, messageId: Snowflake) =>
    `/channels/${channelId}/pins/${messageId}` as const,
  channelBulkDelete: (id: Snowflake) => `/channels/${id}/messages/bulk-delete` as const,
  channelWebhooks: (id: Snowflake) => `/channels/${id}/webhooks` as const,
  channelTyping: (id: Snowflake) => `/channels/${id}/typing` as const,
  channelInvites: (id: Snowflake) => `/channels/${id}/invites` as const,
  channelPermission: (channelId: Snowflake, overwriteId: Snowflake) =>
    `/channels/${channelId}/permissions/${overwriteId}` as const,
  channelRecipient: (channelId: Snowflake, userId: Snowflake) =>
    `/channels/${channelId}/recipients/${userId}` as const,
  channelMessageAttachment: (channelId: Snowflake, messageId: Snowflake, attachmentId: Snowflake) =>
    `/channels/${channelId}/messages/${messageId}/attachments/${attachmentId}` as const,

  // Guilds
  guilds: () => '/guilds' as const,
  guild: (id: Snowflake) => `/guilds/${id}` as const,
  guildDelete: (guildId: Snowflake) => `/guilds/${guildId}/delete` as const,
  guildVanityUrl: (guildId: Snowflake) => `/guilds/${guildId}/vanity-url` as const,
  guildTextChannelFlexibleNames: (guildId: Snowflake) =>
    `/guilds/${guildId}/text-channel-flexible-names` as const,
  guildDetachedBanner: (guildId: Snowflake) => `/guilds/${guildId}/detached-banner` as const,
  guildDisallowUnclaimedAccounts: (guildId: Snowflake) =>
    `/guilds/${guildId}/disallow-unclaimed-accounts` as const,
  guildTransferOwnership: (guildId: Snowflake) => `/guilds/${guildId}/transfer-ownership` as const,
  guildRolesHoistPositions: (guildId: Snowflake) =>
    `/guilds/${guildId}/roles/hoist-positions` as const,
  guildEmojisBulk: (guildId: Snowflake) => `/guilds/${guildId}/emojis/bulk` as const,
  guildStickersBulk: (guildId: Snowflake) => `/guilds/${guildId}/stickers/bulk` as const,
  guildChannels: (id: Snowflake) => `/guilds/${id}/channels` as const,
  guildMembers: (id: Snowflake) => `/guilds/${id}/members` as const,
  guildMember: (guildId: Snowflake, userId: Snowflake) =>
    `/guilds/${guildId}/members/${userId}` as const,
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

  // Users
  user: (id: Snowflake) => `/users/${id}` as const,
  currentUser: () => `/users/@me` as const,
  currentUserGuilds: () => `/users/@me/guilds` as const,
  leaveGuild: (guildId: Snowflake) => `/users/@me/guilds/${guildId}` as const,
  userMeChannels: () => `/users/@me/channels` as const,
  /** GET /users/{id}/profile. Pass guildId for server-specific profile. */
  userProfile: (id: Snowflake, guildId?: Snowflake): string =>
    guildId ? `/users/${id}/profile?guild_id=${guildId}` : `/users/${id}/profile`,

  // Instance (unauthenticated)
  instance: () => '/instance' as const,

  // Gateway
  gatewayBot: () => `/gateway/bot` as const,

  // Streams (voice channel screen share preview)
  streamPreview: (streamKey: string) =>
    `/streams/${encodeURIComponent(streamKey)}/preview` as const,

  // Application commands (slash commands)
  applicationCommands: (applicationId: Snowflake) =>
    `/applications/${applicationId}/commands` as const,
  applicationCommand: (applicationId: Snowflake, commandId: Snowflake) =>
    `/applications/${applicationId}/commands/${commandId}` as const,
  interactionCallback: (interactionId: Snowflake, interactionToken: string) =>
    `/interactions/${interactionId}/${interactionToken}/callback` as const,

  // OAuth2 / Bot
  oauth2ApplicationBot: (id: Snowflake) => `/oauth2/applications/${id}/bot` as const,
  oauth2ApplicationBotResetToken: (id: Snowflake) =>
    `/oauth2/applications/${id}/bot/reset-token` as const,
} as const;
