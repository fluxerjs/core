import type { AttachmentBuilder, EmbedBuilder } from '@fluxerjs/builders';
import type {
  APIAllowedMentions,
  APIMessageReference,
  MessageReferenceType,
  RESTPostAPIEmbed,
  RESTPostAPIMessageUploadedAttachment,
} from '@fluxerjs/types';

/** Resolved file data (after URL fetch). Used internally by REST layer. */
export interface ResolvedMessageFile {
  name: string;
  data: Blob | ArrayBuffer | Uint8Array | Buffer;
  filename?: string;
}

/** File data for message attachment uploads. Use `data` for buffers or `url` to fetch from a URL. */
export type MessageFileData =
  | {
      name: string;
      data: Blob | ArrayBuffer | Uint8Array | Buffer;
      filename?: string;
    }
  | {
      name: string;
      url: string;
      filename?: string;
    };

/** Attachment metadata for file uploads (id matches FormData index). */
export interface MessageAttachmentMeta {
  id: number;
  filename: string;
  title?: string | null;
  description?: string | null;
  /** MessageAttachmentFlags: IS_SPOILER (8), CONTAINS_EXPLICIT_MEDIA (16), IS_ANIMATED (32) */
  flags?: number;
}

/** SDK options for allowed mentions (camelCase). Converted to APIAllowedMentions on send. */
export type AllowedMentionsOptions = {
  /** Mention parse groups to allow (`users`, `roles`, `everyone`). Empty array suppresses all. */
  parse?: APIAllowedMentions['parse'];
  /** Explicit user IDs that may be mentioned. */
  users?: string[];
  /** Explicit role IDs that may be mentioned. */
  roles?: string[];
  /** Whether to @mention and notify the author of the replied-to message. */
  repliedUser?: boolean;
};

/**
 * Common allowed-mentions presets.
 * @example
 * await message.reply('Got it!', { ping: false });
 * await message.reply({ content: 'Got it!', allowedMentions: AllowedMentions.suppressReplyPing });
 */
export const AllowedMentions = {
  suppressReplyPing: { repliedUser: false } satisfies AllowedMentionsOptions,
  none: { parse: [] } satisfies AllowedMentionsOptions,
  all: { parse: ['users', 'roles', 'everyone'] } satisfies AllowedMentionsOptions,
} as const;

/** Target message for `replyTo` / `forward` on send options. */
export type MessageReplyTarget = {
  /** Channel that owns the target message. */
  channelId: string;
  /** Target message snowflake. */
  messageId: string;
  /** Guild id when known (optional for DMs / partials). */
  guildId?: string | null;
  /** {@link MessageReferenceType.Default} = reply, {@link MessageReferenceType.Forward} = forward */
  type?: MessageReferenceType;
  /** Attachment ids to include when forwarding. */
  attachmentIds?: string[];
  /** Embed indices to include when forwarding. */
  embedIndices?: number[];
};

/** Options for sending a message via channel/message helpers. */
export type MessageSendOptions = {
  /** Plain text body. */
  content?: string;
  /** Embed payloads or {@link EmbedBuilder} instances. */
  embeds?: (RESTPostAPIEmbed | EmbedBuilder)[];
  /** Local files, remote URLs, or {@link AttachmentBuilder} instances. */
  files?: Array<MessageFileData | AttachmentBuilder>;
  /** Attachment metadata aligned with uploaded `files` indices (or {@link AttachmentMeta}). */
  attachments?: MessageAttachmentMeta[];
  /** Already-uploaded CDN attachments (skip multipart). */
  uploadedAttachments?: RESTPostAPIMessageUploadedAttachment[];
  /** Who may be mentioned; see {@link AllowedMentionsOptions}. */
  allowedMentions?: AllowedMentionsOptions;
  /** Reply to an existing message (sets message_reference). */
  replyTo?: MessageReplyTarget;
  /** Forward an existing message into this channel. */
  forward?: MessageReplyTarget;
  /**
   * Shortcut for reply pings. `false` sets `allowedMentions.repliedUser` to false.
   * Prefer explicit {@link AllowedMentionsOptions} when you need full control.
   */
  ping?: boolean;
  /** Text-to-speech flag. */
  tts?: boolean;
  /** Sticker snowflakes to attach. */
  stickerIds?: string[];
  /** Client-generated nonce for deduplication. */
  nonce?: string;
  /** Favorite meme id when sending a saved meme. */
  favoriteMemeId?: string;
  /** Message flags bitfield. */
  flags?: number;
};

/** API-ready body from MessageSendOptions. */
export interface SendBodyResult {
  content?: string;
  embeds?: RESTPostAPIEmbed[];
  attachments?: Array<
    | {
        id: number;
        filename: string;
        title?: string | null;
        description?: string | null;
        flags?: number;
      }
    | RESTPostAPIMessageUploadedAttachment
  >;
  allowed_mentions?: APIAllowedMentions;
  message_reference?: APIMessageReference;
  sticker_ids?: string[];
  nonce?: string;
  favorite_meme_id?: string;
  tts?: boolean;
  flags?: number;
}

/** REST post payload for POST /channels/{id}/messages. */
export interface MessagePostPayload {
  body: SendBodyResult;
  files?: ResolvedMessageFile[];
}
