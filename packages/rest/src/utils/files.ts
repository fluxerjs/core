import { FormData } from 'undici';

/**
 * Multipart builder matching fluxer_api parseMultipartMessageData:
 * payload_json + files[0], files[1], ...
 */

export type AttachmentData = Blob | ArrayBuffer | Uint8Array | Buffer;

export interface AttachmentPayload {
  name: string;
  data: AttachmentData;
  filename?: string;
}

function toFormDataFile(data: AttachmentData, filename: string): Blob | File {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
  if (typeof File !== 'undefined') {
    return new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  }
  return blob;
}

export function buildFormData(
  payloadJson: Record<string, unknown>,
  files?: AttachmentPayload[],
): FormData {
  const form = new FormData();
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
      form.append(`files[${i}]`, toFormDataFile(file.data, filename), filename);
    }
  }

  return form;
}
