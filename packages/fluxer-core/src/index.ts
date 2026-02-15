export { Client, type ClientEvents } from './client/Client.js';
export { ChannelManager } from './client/ChannelManager.js';
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
export { Message, type MessageEditOptions } from './structures/Message.js';
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
export { FluxerError } from './errors/FluxerError.js';
export { ErrorCodes } from './errors/ErrorCodes.js';

// Re-export builders for convenience
export { EmbedBuilder, MessagePayload, AttachmentBuilder } from '@fluxerjs/builders';

// Re-export Routes and GatewayOpcodes for REST/gateway API calls
export { Routes, GatewayOpcodes } from '@fluxerjs/types';
