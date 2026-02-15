/**
 * Builder for message attachment metadata (filename, description, spoiler).
 * Actual file data is passed separately when sending (e.g. FormData).
 */
export interface AttachmentPayloadOptions {
  name: string;
  description?: string;
  spoiler?: boolean;
}

/** API format for an attachment in a message payload. */
export interface APIAttachmentPayload {
  id: number;
  filename: string;
  description?: string | null;
}

/** Builder for attachment metadata (filename, description, spoiler). Actual file data is passed separately when sending. */
export class AttachmentBuilder {
  public readonly id: number;
  public filename: string;
  public description?: string | null;
  public spoiler: boolean;

  /** @param id - Index of the attachment (0-based). Must match the FormData part order. */
  constructor(id: number, filename: string, options?: Partial<AttachmentPayloadOptions>) {
    if (!filename?.trim()) {
      throw new Error('Filename is required');
    }
    this.id = id;
    this.filename = options?.spoiler ? `SPOILER_${filename}` : filename;
    this.description = options?.description ?? undefined;
    this.spoiler = options?.spoiler ?? false;
  }

  /** Set the displayed filename. */
  setName(name: string): this {
    if (!name?.trim()) {
      throw new Error('Filename is required');
    }
    this.filename = this.spoiler ? `SPOILER_${name}` : name;
    return this;
  }

  /** Set the attachment description (alt text). */
  setDescription(description: string | null): this {
    this.description = description ?? undefined;
    return this;
  }

  /** Mark the attachment as a spoiler (blurred until clicked). */
  setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    if (spoiler && !this.filename.startsWith('SPOILER_'))
      this.filename = `SPOILER_${this.filename}`;
    else if (!spoiler && this.filename.startsWith('SPOILER_'))
      this.filename = this.filename.slice(8);
    return this;
  }

  /** Convert to API format for MessagePayload. */
  toJSON(): APIAttachmentPayload {
    return {
      id: this.id,
      filename: this.filename,
      description: this.description ?? undefined,
    };
  }
}
