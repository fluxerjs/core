import type { APIEmbed } from '@fluxerjs/types';
import { EmbedBuilder } from '@fluxerjs/builders';

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

const FILE_FETCH_TIMEOUT_MS = 30_000;

/** Resolve files: fetch URLs to buffers, pass through data as-is. */
export async function resolveMessageFiles(
  files: MessageFileData[],
): Promise<ResolvedMessageFile[]> {
  const result: ResolvedMessageFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    const filename = f.filename ?? f.name;
    if ('url' in f && f.url) {
      if (!URL.canParse(f.url)) {
        throw new Error(`Invalid file URL at index ${i}: ${f.url}`);
      }
      const res = await fetch(f.url, {
        signal: AbortSignal.timeout(FILE_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch file from ${f.url}: ${res.status} ${res.statusText}`);
      }
      const data = await res.arrayBuffer();
      result.push({ name: f.name, data, filename });
    } else if ('data' in f && f.data != null) {
      result.push({ name: f.name, data: f.data, filename });
    } else {
      throw new Error(`File at index ${i} must have either "data" or "url"`);
    }
  }
  return result;
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

/** Options for sending a message (content, embeds, files). Used by Message.send, Channel.send, ChannelManager.send.
 * EmbedBuilder instances are auto-converted to API format—no need to call .toJSON().
 */
export type MessageSendOptions =
  | string
  | {
      content?: string;
      /** EmbedBuilder instances are auto-converted; raw APIEmbed also supported. */
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
