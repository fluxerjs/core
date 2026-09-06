import { ErrorCodes, FluxerError } from '@fluxerjs/util';

/** File bytes or a remote URL accepted by {@link AttachmentBuilder}. */
export type AttachmentFileInput = Blob | ArrayBuffer | Uint8Array | string;

/** Options for {@link AttachmentBuilder}. */
export interface AttachmentBuilderOptions {
  /** Filename (required; prefixed with `SPOILER_` when spoiler is true). */
  name: string;
  /** Alt text / description for accessibility (optional). */
  description?: string;
  /** Whether this attachment should be hidden until clicked (optional). */
  spoiler?: boolean;
}

/** Options for {@link AttachmentMeta}. */
export interface AttachmentPayloadOptions {
  /** Filename (required; prefixed with `SPOILER_` if spoiler is true). */
  name: string;
  /** Alt text / description for accessibility (optional). */
  description?: string;
  /** Whether this attachment should be hidden until clicked (optional). */
  spoiler?: boolean;
}

/** API-ready attachment metadata. */
export interface APIAttachmentPayload {
  /** Attachment ID (index in files array). */
  id: number;
  /** Filename (may be prefixed with `SPOILER_`). */
  filename: string;
  /** Alt text / description (optional). */
  description?: string | null;
}

function requireFilename(name: string): string {
  if (!name?.trim()) {
    throw new FluxerError('Filename is required', { code: ErrorCodes.AttachmentFilenameRequired });
  }
  return name;
}

function applySpoilerFilename(filename: string, spoiler: boolean): string {
  const base = requireFilename(filename);
  if (!spoiler) return base.startsWith('SPOILER_') ? base.slice(8) : base;
  return base.startsWith('SPOILER_') ? base : `SPOILER_${base}`;
}

/**
 * Attachment metadata for message payloads (file bytes sent separately).
 * Prefer {@link AttachmentBuilder} when attaching file data via `files: [builder]`.
 * @example
 * ```ts
 * const meta = new AttachmentMeta(0, 'cat.png').setDescription('Cute cat');
 * await message.reply({ files: [fileData], attachments: [meta] });
 * ```
 */
export class AttachmentMeta {
  /** Attachment ID (index in files array). */
  public readonly id: number;
  /** Filename (may be prefixed with `SPOILER_` if spoiler is true). */
  public filename: string;
  /** Alt text / description for accessibility. */
  public description?: string | null;
  /** Whether this attachment should be hidden until clicked. */
  public spoiler: boolean;

  constructor(id: number, filename: string, options?: Partial<AttachmentPayloadOptions>) {
    this.id = id;
    this.spoiler = options?.spoiler ?? false;
    this.filename = applySpoilerFilename(filename, this.spoiler);
    this.description = options?.description ?? undefined;
  }

  setName(name: string): this {
    this.filename = applySpoilerFilename(name, this.spoiler);
    return this;
  }

  setDescription(description: string | null): this {
    this.description = description ?? undefined;
    return this;
  }

  setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    this.filename = applySpoilerFilename(
      this.filename.startsWith('SPOILER_') ? this.filename.slice(8) : this.filename,
      spoiler,
    );
    return this;
  }

  toJSON(): APIAttachmentPayload {
    const payload: APIAttachmentPayload = { id: this.id, filename: this.filename };
    if (this.description != null) payload.description = this.description;
    return payload;
  }
}

/**
 * File attachment for `files: [builder]` send paths.
 * @example
 * ```ts
 * const file = new AttachmentBuilder(buffer, { name: 'report.txt' });
 * await message.reply({ content: 'Report attached', files: [file] });
 * ```
 */
export class AttachmentBuilder {
  /** Local file bytes when constructed with a buffer/blob. */
  public readonly attachment: Blob | ArrayBuffer | Uint8Array | null;
  /** Remote URL when constructed with a string URL. */
  public readonly url: string | null;
  /** Display / upload name (may include `SPOILER_` prefix). */
  public name: string;
  /** Alt text / description for accessibility. */
  public description?: string | null;
  /** Whether this attachment should be hidden until clicked. */
  public spoiler: boolean;

  constructor(file: AttachmentFileInput, options: AttachmentBuilderOptions) {
    this.spoiler = options.spoiler ?? false;
    this.name = applySpoilerFilename(options.name, this.spoiler);
    this.description = options.description ?? undefined;
    if (typeof file === 'string') {
      this.url = file;
      this.attachment = null;
    } else {
      this.url = null;
      this.attachment = file;
    }
  }

  /** Filename alias used by send helpers (same as {@link name}). */
  get filename(): string {
    return this.name;
  }

  setName(name: string): this {
    this.name = applySpoilerFilename(name, this.spoiler);
    return this;
  }

  setDescription(description: string | null): this {
    this.description = description ?? undefined;
    return this;
  }

  setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    this.name = applySpoilerFilename(
      this.name.startsWith('SPOILER_') ? this.name.slice(8) : this.name,
      spoiler,
    );
    return this;
  }

  /**
   * Convert to the `{ name, data | url }` shape used by message send helpers.
   */
  toFileData():
    | { name: string; data: Blob | ArrayBuffer | Uint8Array; filename: string }
    | { name: string; url: string; filename: string } {
    if (this.url != null) {
      return { name: this.name, url: this.url, filename: this.name };
    }
    if (this.attachment == null) {
      throw new FluxerError('AttachmentBuilder has no file data or URL', {
        code: ErrorCodes.InvalidAttachment,
      });
    }
    return { name: this.name, data: this.attachment, filename: this.name };
  }

  /**
   * Serialize metadata for an `attachments` array (optional `id` defaults to 0).
   */
  toJSON(id = 0): APIAttachmentPayload {
    const payload: APIAttachmentPayload = { id, filename: this.name };
    if (this.description != null) payload.description = this.description;
    return payload;
  }
}
