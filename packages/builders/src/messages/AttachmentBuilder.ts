/**
 * Builder for message attachment metadata (filename, description, spoiler).
 * Actual file data is passed separately when sending (e.g. FormData).
 */
export interface AttachmentPayloadOptions {
  name: string;
  description?: string;
  spoiler?: boolean;
}

export interface APIAttachmentPayload {
  id: number;
  filename: string;
  description?: string | null;
}

export class AttachmentBuilder {
  public readonly id: number;
  public filename: string;
  public description?: string | null;
  public spoiler: boolean;

  constructor(id: number, filename: string, options?: Partial<AttachmentPayloadOptions>) {
    this.id = id;
    this.filename = options?.spoiler ? `SPOILER_${filename}` : filename;
    this.description = options?.description ?? undefined;
    this.spoiler = options?.spoiler ?? false;
  }

  setName(name: string): this {
    this.filename = this.spoiler ? `SPOILER_${name}` : name;
    return this;
  }

  setDescription(description: string | null): this {
    this.description = description ?? undefined;
    return this;
  }

  setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    if (spoiler && !this.filename.startsWith('SPOILER_')) this.filename = `SPOILER_${this.filename}`;
    else if (!spoiler && this.filename.startsWith('SPOILER_')) this.filename = this.filename.slice(8);
    return this;
  }

  toJSON(): APIAttachmentPayload {
    return {
      id: this.id,
      filename: this.filename,
      description: this.description ?? undefined,
    };
  }
}
