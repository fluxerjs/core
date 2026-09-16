import type {
  RESTPostAPIChannelAttachmentCompleteRequest,
  RESTPostAPIChannelAttachmentUploadResponse,
  RESTPostAPIMessageUploadedAttachment,
} from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { FluxerError } from '../../LibErrors/FluxerError.js';

/** Bot uploads are clamped to 50 MiB even when a guild allowance is higher. */
export const BOT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

/**
 * Server split between singlepart and multipart presigned uploads.
 * Documented here so callers can size files; the plan response still chooses `upload_mode`.
 */
export const ATTACHMENT_MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024;

export type UploadFileForSend = {
  id: number;
  filename: string;
  data: ArrayBuffer | Uint8Array | Buffer;
  /** MIME type sent on the plan request and used for singlepart PUT. */
  contentType: string;
};

/** Merged `limits.rules[].overrides` from instance discovery, when present. */
export function instanceLimitOverridesSnapshot(client: Client): Record<string, number> | null {
  const rules = client.instance.discovery?.limits?.rules;
  if (!rules?.length) return null;
  const snapshot: Record<string, number> = {};
  for (const rule of rules) {
    Object.assign(snapshot, rule.overrides);
  }
  return Object.keys(snapshot).length ? snapshot : null;
}

function assertBotAttachmentLimits(client: Client, files: UploadFileForSend[]): void {
  const snapshot = instanceLimitOverridesSnapshot(client);
  for (const file of files) {
    const size = file.data.byteLength;
    if (size <= BOT_ATTACHMENT_MAX_BYTES) continue;
    const snapshotNote = snapshot ? ` Instance limit overrides: ${JSON.stringify(snapshot)}.` : '';
    throw new FluxerError(
      `Bot attachments are limited to 50 MiB (${BOT_ATTACHMENT_MAX_BYTES} bytes); "${file.filename}" is ${size} bytes.${snapshotNote}`,
      { code: ErrorCodes.AttachmentTooLarge },
    );
  }
}

function asBytes(data: ArrayBuffer | Uint8Array | Buffer): Uint8Array<ArrayBuffer> {
  const src = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
  const out = new Uint8Array(src.byteLength);
  out.set(src);
  return out;
}

async function putBlob(url: string, body: Blob, contentType?: string): Promise<void> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: contentType ? { 'Content-Type': contentType } : undefined,
    body,
  });
  if (!res.ok) {
    throw new FluxerError(`Presigned upload failed: ${res.status}`, {
      code: ErrorCodes.AttachmentUploadFailed,
    });
  }
}

/**
 * Plan → PUT → `uploadedAttachments` for `send()`.
 * Bots are clamped to {@link BOT_ATTACHMENT_MAX_BYTES} (50 MiB) before PUT.
 * The server splits singlepart vs multipart at {@link ATTACHMENT_MULTIPART_THRESHOLD_BYTES} (10 MiB).
 */
export async function uploadAttachmentsForSend(
  client: Client,
  channelId: string,
  files: UploadFileForSend[],
): Promise<RESTPostAPIMessageUploadedAttachment[]> {
  assertBotAttachmentLimits(client, files);

  const plan = await client.rest.post<RESTPostAPIChannelAttachmentUploadResponse>(
    Routes.channelAttachments(channelId),
    {
      body: {
        attachments: files.map((f) => ({
          id: f.id,
          filename: f.filename,
          file_size: f.data.byteLength,
          content_type: f.contentType,
        })),
      },
      auth: true,
    },
  );

  const multipart: RESTPostAPIChannelAttachmentCompleteRequest['uploads'] = [];
  const uploaded: RESTPostAPIMessageUploadedAttachment[] = [];

  for (const item of plan.attachments) {
    const file = files.find((f) => f.id === item.id);
    if (!file) {
      throw new FluxerError(`No file data for planned attachment id ${item.id}`, {
        code: ErrorCodes.InvalidAttachmentInput,
      });
    }
    const bytes = asBytes(file.data);

    if (item.upload_mode === 'singlepart') {
      await putBlob(
        item.upload_url,
        new Blob([bytes], { type: file.contentType }),
        item.content_type,
      );
    } else {
      for (const part of item.parts) {
        const start = (part.part_number - 1) * item.part_size;
        const chunk = bytes.subarray(start, Math.min(start + item.part_size, bytes.byteLength));
        await putBlob(part.upload_url, new Blob([asBytes(chunk)]));
      }
      multipart.push({ upload_filename: item.upload_filename, upload_id: item.upload_id });
    }

    uploaded.push({
      id: item.id,
      filename: item.filename,
      upload_filename: item.upload_filename,
      file_size: item.file_size,
      content_type: item.content_type,
    });
  }

  if (multipart.length) {
    await client.rest.post(Routes.channelAttachmentsComplete(channelId), {
      body: { uploads: multipart },
      auth: true,
    });
  }
  return uploaded;
}
