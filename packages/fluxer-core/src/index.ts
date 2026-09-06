// Re-export builders for convenience
export {
  AttachmentBuilder,
  AttachmentMeta,
  EmbedBuilder,
  MessagePayload,
} from '@fluxerjs/builders';
export type {
  APIInstance,
  APIInstanceEndpoints,
  APIWellKnownFluxer,
} from '@fluxerjs/types';
// Re-export Routes, GatewayOpcodes, MessageAttachmentFlags for REST/gateway API calls
export {
  type AllowedMentionType,
  type APIAllowedMentions,
  type APIBulkMessageFetchRequest,
  type APIBulkMessageFetchResponse,
  type APIBulkMessageFetchResponseChannel,
  type APIGuildMemberSearchResponse,
  AuditLogActionType,
  ChannelType,
  ContentWarningLevel,
  GatewayOpcodes,
  GuildMemberProfileFlags,
  GuildNSFWLevel,
  GuildOperations,
  InviteType,
  MessageAttachmentFlags,
  MessageFlags,
  MessageReferenceType,
  MessageType,
  OverwriteType,
  PublicUserFlags,
  RelationshipType,
  Routes,
  SplashCardAlignment,
  SystemChannelFlags,
} from '@fluxerjs/types';
// Re-export Klipy URL resolver and mention parsers for embeds and moderation
// Re-export permission helpers for role/member permission checks
export {
  createLogger,
  type LogFields,
  type Logger,
  type LoggerOptions,
  type LogLevel,
  MessageFlagsBitField,
  MessageFlagsBits,
  type MessageFlagsResolvable,
  type MessageFlagsString,
  PermissionFlags,
  type PermissionResolvable,
  type PermissionString,
  PermissionsBitField,
  parsePrefixCommand,
  parseUserMention,
  resolveKlipyToImageUrl,
  resolvePermissionsToBitfield,
  serializeError,
  UserFlagsBitField,
  UserFlagsBits,
  type UserFlagsResolvable,
  type UserFlagsString,
} from '@fluxerjs/util';
export type { CacheStats } from './ClientCore/CacheController.js';
export { CacheController } from './ClientCore/CacheController.js';
export { ChannelManager } from './ClientCore/ChannelManager.js';
export type { DiscoveryOrigin } from './ClientCore/Client.js';
export {
  Client,
  type ClientEventListener,
  type ClientEventMethods,
  type ClientEventName,
  type ClientEvents,
} from './ClientCore/Client.js';
export {
  type AddClientRuntimeOptions,
  BETA_CLIENT_CLUSTER_WARNING,
  ClientCluster,
  type ClientClusterOptions,
  type ClientRuntime,
  type ClientRuntimeStatus,
  type RestartClientRuntimeOptions,
} from './ClientCore/ClientCluster.js';
export {
  type ClientClusterEventListener,
  type ClientClusterEventMap,
  type ClientClusterEventName,
  ClientClusterEvents,
} from './ClientCore/ClientClusterEvents.js';
export { ClientUser } from './ClientCore/ClientUser.js';
export type {
  AuditLogChange,
  AuditLogEntryPayload,
  // Other public camelCase DTOs (REST / helpers)
  AuditLogFetchPayload,
  ChannelMemberCountsUpdatePayload,
  ChannelPinsUpdatePayload,
  ChannelRecipientPayload,
  GuildCountsUpdatePayload,
  GuildEmojisUpdatePayload,
  GuildMemberSearchHit,
  GuildMemberSearchPayload,
  GuildMembersChunkPayload,
  GuildRoleDeletePayload,
  GuildRoleUpdatePayload,
  GuildStickersUpdatePayload,
  InviteDeletePayload,
  // ClientEvents camelCase DTOs (keep in sync with ClientEvents + EventPayloads)
  MessageDeleteBulkPayload,
  MessageReactionAddManyEntry,
  MessageReactionAddManyPayload,
  MessageReactionPayload,
  MessageReactionRemoveAllPayload,
  MessageReactionRemoveEmojiPayload,
  PartialUserGuildPayload,
  PresenceActivity,
  PresenceUpdateBulkPayload,
  PresenceUpdatePayload,
  ReactionEmojiPayload,
  TypingStartPayload,
  VanityURLPayload,
  WebhooksUpdatePayload,
} from './ClientCore/EventPayloads.js';
export { GuildMemberManager } from './ClientCore/GuildMemberManager.js';
export { GuildManager } from './ClientCore/GuildManager.js';
export {
  type BulkFetchMessagesChannelResult,
  type BulkFetchMessagesOptions,
  type BulkFetchMessagesResult,
  type FetchMessagesOptions,
  MessageManager,
} from './ClientCore/MessageManager.js';
export type {
  AttachmentUploadCompleteItem,
  AttachmentUploadCompleteResponse,
  AttachmentUploadPlanItem,
  AttachmentUploadPlanResponse,
  BulkFetchMessagesRequest,
  ChannelEditOptions,
  ChannelInviteCreateOptions,
  ChannelSlowmodePayload,
  DiscoveryApplicationOptions,
  DiscoveryApplicationPayload,
  DiscoveryStatusPayload,
  ExpressionCreateOptions,
  ExpressionEditOptions,
  GuildChannelCreateOptions,
  GuildMemberEditOptions,
  GuildMemberSearchOptions,
  GroupDmEditOptions,
  MessageAttachmentEdit,
  MessageSearchIndexing,
  MessageSearchOptions,
  MessageSearchResponse,
  MessageSearchResults,
  PresenceUpdateOptions,
  ProfilePayload,
  RtcRegionPayload,
  StickerCreateOptions,
  StickerEditOptions,
  SudoVerificationOptions,
  WebhookEditOptions,
} from './ClientCore/SdkOptions/index.js';
export {
  type FetchedUserWithProfile,
  UserManager,
} from './ClientCore/UserManager.js';
export { Base } from './Domain/Base.js';
export {
  CategoryChannel,
  Channel,
  DMChannel,
  type FetchPinnedMessagesOptions,
  GuildChannel,
  LinkChannel,
  PermissionOverwrite,
  type PermissionOverwriteEditOptions,
  PermissionOverwriteManager,
  type PinnedMessagesPage,
  type TextBasedChannel,
  TextChannel,
  type UploadFileForSend,
  VoiceChannel,
} from './Domain/Channel/index.js';
export { Guild } from './Domain/Guild/Guild.js';
export { GuildBan } from './Domain/Guild/GuildBan.js';
export { GuildEmoji } from './Domain/Guild/GuildEmoji.js';
export { GuildMember } from './Domain/Guild/GuildMember.js';
export {
  GuildMemberRoleManager,
  type RoleResolvable,
} from './Domain/Guild/GuildMemberRoleManager.js';
export { GuildSticker } from './Domain/Guild/GuildSticker.js';
export { PartialGuildMember } from './Domain/Guild/PartialGuildMember.js';
export { GuildRoleManager } from './Domain/Guild/GuildRoleManager.js';
export { Role } from './Domain/Guild/Role.js';
export type { RoleCreateOptions, RoleEditOptions } from './Domain/Guild/RoleOptions.js';
export {
  Invite,
  type InviteChannelSnapshot,
  type InviteGuildSnapshot,
} from './Domain/Invite.js';
export type { MessageAttachment } from './Domain/Message/Attachment.js';
export type {
  MessageEmbed,
  MessageEmbedAuthor,
  MessageEmbedField,
  MessageEmbedFooter,
  MessageEmbedMedia,
} from './Domain/Message/Embed.js';
export {
  type AllowedMentionsOptions,
  Message,
  type MessageCall,
  type MessageEditOptions,
  type MessagePrepareInput,
  type MessageReference,
  type MessageReplyTarget,
  type MessageSendOptions,
  type MessageSnapshot,
  type ReplyOptions,
} from './Domain/Message/index.js';
export { MessageReaction } from './Domain/Message/MessageReaction.js';
export { MessageReactionManager } from './Domain/Message/MessageReactionManager.js';
export { MessageSticker } from './Domain/Message/MessageSticker.js';
export { PartialMessage } from './Domain/Message/PartialMessage.js';
export { User } from './Domain/User.js';
export {
  Webhook,
  type WebhookMessageEditOptions,
  type WebhookSendOptions,
} from './Domain/Webhook.js';
export type { CdnUrlOptions } from './Helpers/Cdn.js';
export {
  cdnAvatarURL,
  cdnBannerURL,
  cdnDefaultAvatarURL,
  cdnDisplayAvatarURL,
  cdnEmojiURL,
  cdnGuildAssetURL,
  cdnMemberAvatarURL,
  cdnMemberBannerURL,
  cdnStickerURL,
} from './Helpers/Cdn.js';
export { CDN_URL, STATIC_CDN_URL } from './Helpers/Constants.js';
export { Events } from './Helpers/Events.js';
export {
  DEFAULT_INSTANCE_ENDPOINTS,
  inviteUrl,
  normalizeApiOrigin,
  parseInstanceDiscovery,
  type ResolvedInstance,
  resolveInstanceEndpoints,
} from './Helpers/Instance.js';
export {
  MessageCollector,
  type MessageCollectorEndReason,
  type MessageCollectorOptions,
} from './Helpers/MessageCollector.js';
export { AllowedMentions } from './Helpers/MessageUtils/index.js';
export type { CacheSizeLimits, ClientOptions, ResolvedCacheLimits } from './Helpers/Options.js';
export {
  DEFAULT_CACHE_LIMITS,
  normalizeCacheLimit,
  resolveCacheLimits,
} from './Helpers/Options.js';
export {
  type CollectedReaction,
  ReactionCollector,
  type ReactionCollectorEndReason,
  type ReactionCollectorOptions,
} from './Helpers/ReactionCollector.js';
export { ErrorCodes } from './LibErrors/ErrorCodes.js';
export { FluxerError, type FluxerErrorOptions } from './LibErrors/FluxerError.js';
