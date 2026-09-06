import type { Snowflake } from '../Common/Snowflake.js';
import type { APIEmbed } from './Embed.js';
import type { APIGuildMember, APIUser } from './User.js';

/**
 * Message type discriminator (OpenAPI MessageType).
 * - `Default` — standard user/bot message
 * - `RecipientAdd` — DM group recipient added
 * - `RecipientRemove` — DM group recipient removed
 * - `Call` — voice/video call
 * - `ChannelNameChange` — channel name updated
 * - `ChannelIconChange` — channel icon updated
 * - `ChannelPinnedMessage` — message pinned
 * - `UserJoin` — member joined guild
 * - `Reply` — reply to another message
 */
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
  /** Client-only system message (Fluxer `CLIENT_SYSTEM`). */
  ClientSystem = 99,
}

/**
 * Message reference kind (OpenAPI MessageReferenceType).
 * - `Default` — reply to a message
 * - `Forward` — forwarded message
 */
export enum MessageReferenceType {
  Default = 0,
  Forward = 1,
}

/**
 * Message flags bitfield (OpenAPI MessageFlags).
 * Sendable flags are `SUPPRESS_EMBEDS`, `SUPPRESS_NOTIFICATIONS`, and `VOICE_MESSAGE`.
 * Use with {@link MessageFlagsBitField} in `@fluxerjs/util` for composition.
 */
export const MessageFlags = {
  SuppressEmbeds: 4,
  SuppressNotifications: 4096,
  VoiceMessage: 8192,
} as const;

/** Union of all valid {@link MessageFlags} values. */
export type MessageFlagsValue = (typeof MessageFlags)[keyof typeof MessageFlags];

/**
 * Mention types parsed from message content when sending.
 * - `users` — parse @mentions
 * - `roles` — parse @role mentions
 * - `everyone` — parse @everyone/@here
 */
export type AllowedMentionType = 'users' | 'roles' | 'everyone';

/** Controls which mentions trigger notifications in POST/PATCH message payloads. */
export interface APIAllowedMentions {
  /** Which mention types to parse (`users`, `roles`, `everyone`). */
  parse?: AllowedMentionType[];
  /** Specific user IDs to mention. */
  users?: Snowflake[];
  /** Specific role IDs to mention. */
  roles?: Snowflake[];
  /** Whether to mention the author of the replied-to message. */
  replied_user?: boolean;
}

/** Emoji reference in a reaction. */
export interface APIReactionEmoji {
  /** Custom emoji ID, or null for Unicode emoji. */
  id: Snowflake | null;
  /** Emoji name (Unicode char or custom emoji name). */
  name: string;
  /** Whether the emoji is animated. */
  animated?: boolean | null;
}

/** Reaction aggregation on a message. */
export interface APIMessageReaction {
  /** The emoji used. */
  emoji: APIReactionEmoji;
  /** Total count of reactions with this emoji. */
  count: number;
  /** Whether the current user reacted with this emoji. */
  me?: boolean | null;
}

/** Reply/forward reference in GET /channels/{id}/messages. */
export interface APIMessageReference {
  /** Channel containing the referenced message. */
  channel_id: Snowflake;
  /** ID of the referenced message. */
  message_id: Snowflake;
  /** Guild containing the referenced message (if guild message). */
  guild_id?: Snowflake | null;
  /** {@link MessageReferenceType.Default} = reply, {@link MessageReferenceType.Forward} = forward */
  type?: MessageReferenceType;
  /** Forward: attachment IDs to include when forwarding selected media */
  attachment_ids?: Snowflake[];
  /** Forward: embed indices to include when forwarding selected media */
  embed_indices?: number[];
}

/** Call metadata for call-type messages. */
export interface APIMessageCall {
  /** Participant user IDs. */
  participants: string[];
  /** ISO-8601 timestamp when call ended. */
  ended_timestamp?: string | null;
}

/** Snapshot of a forwarded message's content and metadata. */
export interface APIMessageSnapshot {
  /** Message text content. */
  content?: string | null;
  /** ISO-8601 timestamp when the original message was sent. */
  timestamp: string;
  /** ISO-8601 timestamp when the original message was last edited. */
  edited_timestamp?: string | null;
  /** User IDs mentioned in the original message. */
  mentions?: string[] | null;
  /** Role IDs mentioned in the original message. */
  mention_roles?: Snowflake[] | null;
  /** Embeds from the original message. */
  embeds?: APIEmbed[] | null;
  /** Attachments from the original message. */
  attachments?: APIMessageAttachment[] | null;
  /** Stickers from the original message. */
  stickers?: APIMessageSticker[] | null;
  /** Original message type. */
  type?: MessageType;
}

/**
 * Bitwise flags for message attachments (OpenAPI MessageAttachmentFlags).
 * - `IS_SPOILER` — renders attachment as spoiler (blurred until clicked)
 * - `CONTAINS_EXPLICIT_MEDIA` — attachment contains explicit content
 * - `IS_ANIMATED` — animated image (GIF, animated WebP), renders with EmbedGif / looping
 */
export const MessageAttachmentFlags = {
  IS_SPOILER: 8,
  CONTAINS_EXPLICIT_MEDIA: 16,
  IS_ANIMATED: 32,
} as const;

/** File attachment on a message. */
export interface APIMessageAttachment {
  /** Attachment ID (snowflake). */
  id: Snowflake;
  /** Original filename. */
  filename: string;
  /** Display title (if different from filename). */
  title?: string | null;
  /** Alt text / caption for accessibility. */
  description?: string | null;
  /** MIME type when known. */
  content_type?: string | null;
  /** Hash of attachment content for integrity checks. */
  content_hash?: string | null;
  /** File size in bytes. */
  size: number;
  /** CDN URL to download the file. */
  url?: string | null;
  /** CDN proxy URL. */
  proxy_url?: string | null;
  /** Pixel width for images/videos. */
  width?: number | null;
  /** Pixel height for images/videos. */
  height?: number | null;
  /** Base64 placeholder for lazy loading. */
  placeholder?: string | null;
  /** MessageAttachmentFlags bitfield (e.g. IS_SPOILER). */
  flags?: number | null;
  /** Whether the attachment is NSFW. */
  nsfw?: boolean | null;
  /** Duration in seconds for audio/video. */
  duration?: number | null;
  /** Base64 audio waveform for voice messages. */
  waveform?: string | null;
  /** ISO-8601 timestamp when the attachment URL expires. */
  expires_at?: string | null;
  /** Whether the attachment URL has expired. */
  expired?: boolean | null;
}

/** Sticker reference in a message. */
export interface APIMessageSticker {
  /** Sticker ID. */
  id: Snowflake;
  /** Sticker name. */
  name: string;
  /** Sticker description. */
  description?: string;
  /** Sticker tags. */
  tags?: string[];
  /** Whether the sticker is animated. */
  animated?: boolean;
}

/**
 * Full message object from GET /channels/{id}/messages, POST /channels/{id}/messages, PATCH, or gateway MESSAGE_CREATE.
 */
export interface APIMessage {
  /** Message ID. */
  id: Snowflake;
  /** Channel containing the message. */
  channel_id: Snowflake;
  /** Guild containing the message (if guild message). */
  guild_id?: Snowflake | null;
  /** Author of the message. */
  author: APIUser;
  /** Webhook ID if message was sent by a webhook. */
  webhook_id?: Snowflake | null;
  /** Message type (see {@link MessageType}). */
  type: MessageType;
  /** MessageFlags bitfield (see {@link MessageFlags}). */
  flags: number;
  /** Message text content. */
  content: string;
  /** ISO-8601 timestamp when the message was sent. */
  timestamp: string;
  /** ISO-8601 timestamp when the message was last edited (null if never edited). */
  edited_timestamp?: string | null;
  /** Whether the message is pinned. */
  pinned: boolean;
  /** Whether the message mentions @everyone or @here. */
  mention_everyone: boolean;
  /** Whether the message is text-to-speech. */
  tts: boolean;
  /** Users mentioned in the message. */
  mentions: APIUser[];
  /** Role IDs mentioned in the message. */
  mention_roles: Snowflake[];
  /** Channels mentioned that are visible to @everyone. */
  mention_channels?: Array<{
    id: Snowflake;
    guild_id: Snowflake;
    name: string;
    type: number;
  }> | null;
  /** Users referenced from non-notifying content (client resolution). */
  users?: APIUser[] | null;
  /** Embeds attached to the message. */
  embeds?: APIEmbed[] | null;
  /** File attachments. */
  attachments?: APIMessageAttachment[] | null;
  /** Stickers in the message. */
  stickers?: APIMessageSticker[] | null;
  /** Reactions to the message. */
  reactions?: APIMessageReaction[] | null;
  /** Reply/forward reference (see {@link APIMessageReference}). */
  message_reference?: APIMessageReference | null;
  /** Snapshots of forwarded messages. */
  message_snapshots?: APIMessageSnapshot[] | null;
  /** Client-generated unique ID for deduplication. */
  nonce?: string | null;
  /** Call info when type is {@link MessageType.Call}. */
  call?: APIMessageCall | null;
  /** Referenced message (for replies, when available). */
  referenced_message?: APIMessage | null;
  /** Author's guild member object (gateway MESSAGE_CREATE only, when guild message). */
  member?: APIGuildMember | null;
}

/** Single channel window in POST /channels/messages/bulk request. */
export interface APIBulkMessageFetchRequestItem {
  /** Channel to fetch messages from. */
  channel_id: Snowflake;
  /** Maximum number of messages to fetch. */
  limit: number;
  /** Fetch messages before this ID. */
  before?: Snowflake;
  /** Fetch messages after this ID. */
  after?: Snowflake;
  /** Fetch messages around this ID. */
  around?: Snowflake;
}

/** Request body for POST /channels/messages/bulk. */
export interface APIBulkMessageFetchRequest {
  /** List of channel windows to fetch. */
  requests: APIBulkMessageFetchRequestItem[];
}

/** Per-channel messages in bulk fetch response. */
export interface APIBulkMessageFetchResponseChannel {
  /** Channel ID. */
  channel_id: Snowflake;
  /** Messages from this channel. */
  messages: APIMessage[];
}

/** Response from POST /channels/messages/bulk. */
export interface APIBulkMessageFetchResponse {
  /** List of per-channel message arrays. */
  channels: APIBulkMessageFetchResponseChannel[];
}
