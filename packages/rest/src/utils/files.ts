/**
 * Attachment data for multipart requests.
 */
export type AttachmentData = Blob | ArrayBuffer | Uint8Array;

export interface AttachmentPayload {
  name: string;
  data: AttachmentData;
  filename?: string;
}

/**
 * Build FormData for message with attachments.
 * payload_json is the JSON body; files are attached as files[0], files[1], etc.
 */
export function buildFormData(
  payloadJson: Record<string, unknown>,
  files?: AttachmentPayload[],
): FormData {
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payloadJson));
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const blob = file.data instanceof Blob ? file.data : new Blob([file.data as BlobPart]);
      form.append(`files[${i}]`, blob, file.filename ?? file.name);
    }
  }
  return form;
}
