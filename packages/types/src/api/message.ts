import type { Snowflake } from '../common/snowflake.js';
import type { APIUser } from './user.js';
import type { APIEmbed } from './embed.js';

export enum MessageType {
  Default = 0,
  RecipientAdd = 1,
  RecipientRemove = 2,
  Call = 3,
  ChannelNameChange = 4,
  ChannelIconChange = 5,
  ChannelPinnedMessage = 6,
  UserJoin = 7,
  Reply = 19,
}

export enum MessageFlags {
  SuppressEmbeds = 4,
  SuppressNotifications = 4096,
  VoiceMessage = 8192,
  CompactAttachments = 131072,
}

export interface APIReactionEmoji {
  id: Snowflake | null;
  name: string;
  animated?: boolean | null;
}

export interface APIMessageReaction {
  emoji: APIReactionEmoji;
  count: number;
  me?: boolean | null;
}

/** Reply/forward reference from GET /channels/{id}/messages (type 0 = reply) */
export interface APIMessageReference {
  channel_id: Snowflake;
  message_id: Snowflake;
  guild_id?: Snowflake | null;
  type?: number;
}

export interface APIMessageAttachment {
  id: Snowflake;
  filename: string;
  title?: string | null;
  description?: string | null;
  content_type?: string | null;
  size: number;
  url?: string | null;
  proxy_url?: string | null;
  width?: number | null;
  height?: number | null;
  nsfw?: boolean | null;
  duration?: number | null;
  expires_at?: string | null;
  expired?: boolean | null;
}

export interface APIMessageSticker {
  id: Snowflake;
  name: string;
  description?: string;
  tags?: string[];
  animated?: boolean;
}

/**
 * Message from GET /channels/{id}/messages, POST /channels/{id}/messages, PATCH, or gateway MESSAGE_CREATE
 */
export interface APIMessage {
  id: Snowflake;
  channel_id: Snowflake;
  guild_id?: Snowflake | null;
  author: APIUser;
  webhook_id?: Snowflake | null;
  type: MessageType;
  flags: number;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  pinned: boolean;
  mention_everyone?: boolean;
  tts?: boolean;
  mentions?: APIUser[] | null;
  mention_roles?: Snowflake[] | null;
  embeds?: APIEmbed[] | null;
  attachments?: APIMessageAttachment[] | null;
  stickers?: APIMessageSticker[] | null;
  reactions?: APIMessageReaction[] | null;
  message_reference?: APIMessageReference | null;
  referenced_message?: APIMessage | null;
  nonce?: string | null;
}
