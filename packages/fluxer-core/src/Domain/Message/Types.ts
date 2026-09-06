import type { EmbedBuilder } from '@fluxerjs/builders';
import type { MessageType, RESTPostAPIEmbed } from '@fluxerjs/types';
import type { MessageFlagsResolvable } from '@fluxerjs/util';
import type { MessageAttachmentEdit } from '../../ClientCore/SdkOptions/index.js';
import type {
  AllowedMentionsOptions,
  MessageReplyTarget,
  prepareMessagePostPayload,
} from '../../Helpers/MessageUtils/index.js';
import type { MessageAttachment } from './Attachment.js';
import type { MessageEmbed } from './Embed.js';
import type { Message } from './Message.js';
import type { MessageSticker } from './MessageSticker.js';

/** Options for PATCH /channels/{id}/messages/{id}. */
export interface MessageEditOptions {
  content?: string | null;
  embeds?: (RESTPostAPIEmbed | EmbedBuilder)[];
  allowedMentions?: AllowedMentionsOptions;
  flags?: MessageFlagsResolvable | number;
  /** Keep by snowflake `id`, or add via `uploadFilename` from the presigned upload flow. */
  attachments?: MessageAttachmentEdit[];
}

export type PreparedMessagePost = Awaited<ReturnType<typeof prepareMessagePostPayload>>;

/** CamelCase reply / forward reference on a {@link Message}. */
export interface MessageReference {
  channelId: string;
  messageId: string;
  guildId: string | null;
  type?: number;
}

/** CamelCase call metadata on a {@link Message}. */
export interface MessageCall {
  participants: string[];
  endedAt: Date | null;
}

/** CamelCase forwarded-message snapshot on a {@link Message}. */
export interface MessageSnapshot {
  content: string | null;
  createdAt: Date;
  editedAt: Date | null;
  /** User IDs mentioned in the original message (API snapshots only include IDs). */
  mentionUserIds: string[];
  mentionRoles: string[];
  embeds: MessageEmbed[];
  attachments: MessageAttachment[];
  stickers: MessageSticker[];
  type?: MessageType;
}

/** Second-arg / inline options for `message.reply()`. */
export interface ReplyOptions {
  /** `false` suppresses the replied-user ping (`allowed_mentions.replied_user`). Default: client `defaultReplyPing`. */
  ping?: boolean;
  /** Reply to a different message. Default: this message. */
  replyTo?: Message | MessageReplyTarget;
}

export type {
  AllowedMentionsOptions,
  MessagePrepareInput,
  MessageReplyTarget,
  MessageSendOptions,
} from '../../Helpers/MessageUtils/index.js';
export { AllowedMentions } from '../../Helpers/MessageUtils/index.js';
