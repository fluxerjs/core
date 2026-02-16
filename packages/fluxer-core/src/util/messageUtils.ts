import type { APIEmbed } from '@fluxerjs/types';
import { EmbedBuilder } from '@fluxerjs/builders';

/** File data for message attachment uploads (Buffer supported in Node.js). */
export interface MessageFileData {
  name: string;
  data: Blob | ArrayBuffer | Uint8Array | Buffer;
  filename?: string;
}

/** Attachment metadata for file uploads (id matches FormData index). */
export interface MessageAttachmentMeta {
  id: number;
  filename: string;
  title?: string | null;
  description?: string | null;
  /** MessageAttachmentFlags: IS_SPOILER (8), CONTAINS_EXPLICIT_MEDIA (16), IS_ANIMATED (32) */
  flags?: number;
}

/** Options for sending a message (content, embeds, files). Used by Message.send, Channel.send, ChannelManager.send. */
export type MessageSendOptions =
  | string
  | {
      content?: string;
      embeds?: (APIEmbed | EmbedBuilder)[];
      /** File attachments. When present, request uses multipart/form-data. */
      files?: MessageFileData[];
      /** Attachment metadata for files (id = index). Use when files are provided. */
      attachments?: MessageAttachmentMeta[];
    };

/** API-ready body from MessageSendOptions (serializes EmbedBuilder, includes attachments when files present). */
export interface SendBodyResult {
  content?: string;
  embeds?: APIEmbed[];
  attachments?: Array<{
    id: number;
    filename: string;
    title?: string | null;
    description?: string | null;
    flags?: number;
  }>;
}

/** Build API-ready body from MessageSendOptions (serializes EmbedBuilder to APIEmbed). */
export function buildSendBody(options: MessageSendOptions): SendBodyResult {
  const body = typeof options === 'string' ? { content: options } : options;
  const result: SendBodyResult = {};
  if (body.content !== undefined) result.content = body.content;
  if (body.embeds?.length) {
    result.embeds = body.embeds.map((e) => (e instanceof EmbedBuilder ? e.toJSON() : e));
  }
  if (body.files?.length && body.attachments) {
    result.attachments = body.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      ...(a.title != null && { title: a.title }),
      ...(a.description != null && { description: a.description }),
      ...(a.flags != null && { flags: a.flags }),
    }));
  } else if (body.files?.length) {
    result.attachments = body.files.map((f, i) => ({
      id: i,
      filename: f.filename ?? f.name,
    }));
  }
  return result;
}
