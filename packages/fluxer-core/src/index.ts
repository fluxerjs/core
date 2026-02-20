export { Client, type ClientEvents, type ClientEventMethods } from './client/Client.js';
export { ChannelManager } from './client/ChannelManager.js';
export { GuildMemberManager } from './client/GuildMemberManager.js';
export { UsersManager, type FetchedUserWithProfile } from './client/UsersManager.js';
export { MessageManager } from './client/MessageManager.js';
export { ClientUser } from './client/ClientUser.js';
export { Base } from './structures/Base.js';
export { User } from './structures/User.js';
export { Guild } from './structures/Guild.js';
export {
  Channel,
  GuildChannel,
  TextChannel,
  VoiceChannel,
  CategoryChannel,
  LinkChannel,
  DMChannel,
} from './structures/Channel.js';
export { Message, type MessageEditOptions, type MessageSendOptions } from './structures/Message.js';
export type { PartialMessage } from './structures/PartialMessage.js';
export { MessageReaction } from './structures/MessageReaction.js';
export { Webhook, type WebhookSendOptions } from './structures/Webhook.js';
export { GuildMember } from './structures/GuildMember.js';
export { Role } from './structures/Role.js';
export { Invite } from './structures/Invite.js';
export { GuildBan } from './structures/GuildBan.js';
export { GuildEmoji } from './structures/GuildEmoji.js';
export { GuildSticker } from './structures/GuildSticker.js';
export { Events } from './util/Events.js';
export {
  MessageCollector,
  type MessageCollectorOptions,
  type MessageCollectorEndReason,
} from './util/MessageCollector.js';
export {
  ReactionCollector,
  type ReactionCollectorOptions,
  type ReactionCollectorEndReason,
  type CollectedReaction,
} from './util/ReactionCollector.js';
export { FluxerError, type FluxerErrorOptions } from './errors/FluxerError.js';
export { ErrorCodes } from './errors/ErrorCodes.js';

// Re-export builders for convenience
export { EmbedBuilder, MessagePayload, AttachmentBuilder } from '@fluxerjs/builders';

// Re-export Routes, GatewayOpcodes, MessageAttachmentFlags for REST/gateway API calls
export { Routes, GatewayOpcodes, MessageAttachmentFlags } from '@fluxerjs/types';

// Re-export Tenor URL resolver and mention parsers for embeds and moderation
export { resolveTenorToImageUrl, parseUserMention, parsePrefixCommand } from '@fluxerjs/util';

// Re-export permission helpers for role/member permission checks
export {
  PermissionsBitField,
  PermissionFlags,
  resolvePermissionsToBitfield,
  UserFlagsBitField,
  UserFlagsBits,
  type PermissionString,
  type PermissionResolvable,
  type UserFlagsString,
  type UserFlagsResolvable,
} from '@fluxerjs/util';

// CDN URL helpers for avatars, banners, etc. (works with raw API data or User objects)
export { CDN_URL, STATIC_CDN_URL } from './util/Constants.js';
export {
  cdnAvatarURL,
  cdnDisplayAvatarURL,
  cdnBannerURL,
  cdnMemberAvatarURL,
  cdnMemberBannerURL,
  cdnDefaultAvatarURL,
} from './util/cdn.js';
export type { CdnUrlOptions } from './util/cdn.js';
