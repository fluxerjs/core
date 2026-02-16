/**
 * File handling for multipart requests. Matches fluxer_api parseMultipartMessageData exactly:
 * - payload_json: JSON string with content, embeds, attachments metadata
 * - files[N]: File parts where N is 0-based index (fluxer API expects files[0], files[1], etc.)
 *
 * @see fluxer_api MessageController.parseMultipartMessageData
 * @see fluxer_api AttachmentDTOs.ClientAttachmentRequest (id, filename required)
 */

export type AttachmentData = Blob | ArrayBuffer | Uint8Array | Buffer;

export interface AttachmentPayload {
  /** Used as filename when filename is not set (required) */
  name: string;
  data: AttachmentData;
  /** Override filename for the part (defaults to name) */
  filename?: string;
}

/**
 * Convert attachment data to a Blob. Handles Node.js Buffer (extends Uint8Array).
 */
function toBlob(data: AttachmentData): Blob {
  if (data instanceof Blob) return data;
  return new Blob([data as BlobPart]);
}

/**
 * Create a File instance for FormData append. Ensures server receives proper File
 * (fluxer_api checks `file instanceof File`). Node.js 20+ has global File.
 */
function toFormDataFile(data: AttachmentData, filename: string): Blob | File {
  const blob = toBlob(data);
  if (typeof File !== 'undefined') {
    return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  }
  return blob;
}

/**
 * Build FormData for message with attachments.
 * Matches fluxer_api parseMultipartMessageData expectations:
 * - payload_json: JSON string (required)
 * - files[0], files[1], ...: File parts with indices matching payload_json.attachments[].id
 *
 * Attachment metadata in payload_json must have id and filename for each file.
 */
export function buildFormData(
  payloadJson: Record<string, unknown>,
  files?: AttachmentPayload[],
): FormData {
  const form = new FormData();

  // payload_json is required; must include attachments metadata when files present
  const payload = { ...payloadJson };
  if (files?.length && !payload.attachments) {
    payload.attachments = files.map((f, i) => ({
      id: i,
      filename: f.filename ?? f.name,
    }));
  }
  form.append('payload_json', JSON.stringify(payload));

  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const filename = file.filename ?? file.name;
      const part = toFormDataFile(file.data, filename);
      form.append(`files[${i}]`, part, filename);
    }
  }

  return form;
}
