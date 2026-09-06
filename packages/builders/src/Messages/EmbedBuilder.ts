import type {
  APIEmbed,
  APIEmbedField,
  RESTPostAPIEmbed,
  RESTPostAPIEmbedAuthor,
  RESTPostAPIEmbedFooter,
  RESTPostAPIEmbedMedia,
} from '@fluxerjs/types';
import { ErrorCodes, FluxerError, resolveColor } from '@fluxerjs/util';

export type { RESTPostAPIEmbed } from '@fluxerjs/types';

/** Options for embed media (image/thumbnail). */
export interface EmbedMediaOptions {
  /** Media URL (HTTP(S) or `attachment://filename`). */
  url: string;
  /** Alt text for accessibility (optional). */
  description?: string | null;
}

/** Options for embed author. */
export interface EmbedAuthorOptions {
  /** Author name (max 256 characters, auto-truncated). */
  name: string;
  /** Author icon URL (optional). */
  iconURL?: string;
  /** Author URL (clickable name) (optional). */
  url?: string;
}

/** Options for embed footer. */
export interface EmbedFooterOptions {
  /** Footer text (max 2048 characters, auto-truncated). */
  text: string;
  /** Footer icon URL (optional). */
  iconURL?: string;
}

/** Embed field data (name-value pair). */
export interface EmbedFieldData {
  /** Field name (max 256 characters, auto-truncated). */
  name: string;
  /** Field value (max 1024 characters, auto-truncated). */
  value: string;
  /** Whether this field should display inline. */
  inline?: boolean;
}

const MAX = {
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footerText: 2048,
  authorName: 256,
  total: 6000,
} as const;

function assertMediaUrl(url: string): void {
  const ok =
    (url.startsWith('attachment://') &&
      url.length > 'attachment://'.length &&
      !/[\\/]/.test(url.slice('attachment://'.length))) ||
    URL.canParse(url);
  if (!ok) {
    throw new FluxerError('Invalid embed media URL', { code: ErrorCodes.InvalidEmbedMediaUrl });
  }
}

function toMedia(input: string | EmbedMediaOptions): RESTPostAPIEmbedMedia {
  const url = typeof input === 'string' ? input : input.url;
  assertMediaUrl(url);
  if (typeof input === 'string') return { url };
  return input.description != null ? { url, description: input.description } : { url };
}

function toField(field: EmbedFieldData): APIEmbedField {
  return {
    name: field.name.slice(0, MAX.fieldName),
    value: field.value.slice(0, MAX.fieldValue),
    inline: field.inline,
  };
}

type EmbedFromIcon = { icon_url?: string | null; iconUrl?: string | null };

function iconUrlOf(block: EmbedFromIcon | null | undefined): string | undefined {
  return block?.iconUrl ?? block?.icon_url ?? undefined;
}

/** Wire embed or camelCase received-message embed (`iconUrl`, Date timestamp). */
type EmbedFromInput = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  color?: number | null;
  timestamp?: string | Date | null;
  author?: (EmbedFromIcon & { name?: string | null; url?: string | null }) | null;
  footer?: (EmbedFromIcon & { text?: string }) | null;
  image?: { url?: string | null; description?: string | null } | null;
  thumbnail?: { url?: string | null; description?: string | null } | null;
  fields?: APIEmbedField[] | null;
};

/**
 * Request-only embed builder. Emits {@link RESTPostAPIEmbed} (no video/audio).
 * @example
 * ```ts
 * const embed = new EmbedBuilder()
 *   .setTitle('Hello')
 *   .setDescription('World')
 *   .setColor('#5865F2')
 *   .setTimestamp();
 * await channel.send({ embeds: [embed] });
 * ```
 */
export class EmbedBuilder {
  /** Partial embed data (built incrementally via setters). */
  public readonly data: Partial<RESTPostAPIEmbed> = {};

  /**
   * Set embed title (max 256 characters). Pass null to clear.
   * @param title - Title text or null
   * @returns This builder for chaining
   * @throws {RangeError} If title exceeds 256 characters
   */
  setTitle(title: string | null): this {
    if (title !== null && title.length > MAX.title) {
      throw new RangeError(`Title must be ≤${MAX.title} characters`);
    }
    this.data.title = title ?? undefined;
    return this;
  }

  /**
   * Set embed description (max 4096 characters). Pass null to clear.
   * @param description - Description text or null
   * @returns This builder for chaining
   * @throws {RangeError} If description exceeds 4096 characters
   */
  setDescription(description: string | null): this {
    if (description !== null && description.length > MAX.description) {
      throw new RangeError(`Description must be ≤${MAX.description} characters`);
    }
    this.data.description = description ?? undefined;
    return this;
  }

  /**
   * Set embed URL (title becomes clickable). Pass null to clear.
   * @param url - HTTP(S) URL or null
   * @returns This builder for chaining
   * @throws {@link FluxerError} If URL is invalid
   */
  setURL(url: string | null): this {
    if (url != null && url !== '' && !URL.canParse(url)) {
      throw new FluxerError('Invalid embed URL', { code: ErrorCodes.InvalidEmbedUrl });
    }
    this.data.url = url ?? undefined;
    return this;
  }

  /**
   * Set embed color. Pass null to clear.
   * @param color - Number (24-bit RGB), hex string (`#5865F2`), or RGB tuple, or null
   * @returns This builder for chaining
   */
  setColor(color: number | string | [number, number, number] | null): this {
    this.data.color =
      color === null ? undefined : typeof color === 'number' ? color : resolveColor(color);
    return this;
  }

  /**
   * Set embed timestamp. Pass null to clear.
   * @param timestamp - Date object, Unix ms, or undefined (defaults to now), or null
   * @returns This builder for chaining
   */
  setTimestamp(timestamp?: Date | number | null): this {
    if (timestamp === null) {
      this.data.timestamp = undefined;
      return this;
    }
    const date =
      timestamp === undefined
        ? new Date()
        : timestamp instanceof Date
          ? timestamp
          : new Date(timestamp);
    this.data.timestamp = date.toISOString();
    return this;
  }

  /**
   * Set embed author. Pass null to clear.
   * @param options - Author name, icon URL, and URL, or null
   * @returns This builder for chaining
   */
  setAuthor(options: EmbedAuthorOptions | null): this {
    if (!options) {
      this.data.author = undefined;
      return this;
    }
    const author: RESTPostAPIEmbedAuthor = { name: options.name.slice(0, MAX.authorName) };
    if (options.url) author.url = options.url;
    if (options.iconURL) author.icon_url = options.iconURL;
    this.data.author = author;
    return this;
  }

  /**
   * Set embed footer. Pass null to clear.
   * @param options - Footer text and optional icon URL, or null
   * @returns This builder for chaining
   */
  setFooter(options: EmbedFooterOptions | null): this {
    if (!options) {
      this.data.footer = undefined;
      return this;
    }
    const footer: RESTPostAPIEmbedFooter = { text: options.text.slice(0, MAX.footerText) };
    if (options.iconURL) footer.icon_url = options.iconURL;
    this.data.footer = footer;
    return this;
  }

  /**
   * Set embed image (large media below description). Pass null to clear.
   * @param input - URL string or media options, or null
   * @returns This builder for chaining
   * @throws {@link FluxerError} If URL is invalid
   */
  setImage(input: string | EmbedMediaOptions | null): this {
    this.data.image = input ? toMedia(input) : undefined;
    return this;
  }

  /**
   * Set embed thumbnail (small media in top-right corner). Pass null to clear.
   * @param input - URL string or media options, or null
   * @returns This builder for chaining
   * @throws {@link FluxerError} If URL is invalid
   */
  setThumbnail(input: string | EmbedMediaOptions | null): this {
    this.data.thumbnail = input ? toMedia(input) : undefined;
    return this;
  }

  /**
   * Replace all fields (max 25). Pass empty array to clear.
   * @param fields - Field objects (name, value, inline)
   * @returns This builder for chaining
   */
  setFields(...fields: EmbedFieldData[]): this {
    this.data.fields = fields.length ? fields.slice(0, MAX.fields).map(toField) : undefined;
    return this;
  }

  /**
   * Add fields (up to 25 total). Existing fields are preserved.
   * @param fields - Field objects to append
   * @returns This builder for chaining
   */
  addFields(...fields: EmbedFieldData[]): this {
    const current = (this.data.fields ?? []).slice();
    for (const f of fields) {
      if (current.length >= MAX.fields) break;
      current.push(toField(f));
    }
    this.data.fields = current.length ? current : undefined;
    return this;
  }

  /**
   * Splice fields (like Array.prototype.splice).
   * @param index - Start index
   * @param deleteCount - Number of fields to remove
   * @param fields - Fields to insert at index
   * @returns This builder for chaining
   */
  spliceFields(index: number, deleteCount: number, ...fields: EmbedFieldData[]): this {
    const current = (this.data.fields ?? []).slice();
    current.splice(index, deleteCount, ...fields.map(toField));
    this.data.fields = current.length ? current : undefined;
    return this;
  }

  /**
   * Wire payload: request keys only, snake_case nested media/author/footer.
   * @returns API-ready embed object
   * @throws {RangeError} If total character count exceeds 6000
   */
  toJSON(): RESTPostAPIEmbed {
    const d = this.data;
    const total = [
      d.title,
      d.description,
      ...(d.fields ?? []).flatMap((f) => [f.name, f.value]),
      d.footer?.text,
    ]
      .filter(Boolean)
      .join('').length;
    if (total > MAX.total) throw new RangeError(`Embed total length must be ≤${MAX.total}`);

    const out: RESTPostAPIEmbed = { description: d.description ?? null };
    if (d.title != null) out.title = d.title;
    if (d.url != null) out.url = d.url;
    if (d.color != null) out.color = d.color;
    if (d.timestamp != null) out.timestamp = d.timestamp;
    if (d.author) out.author = d.author;
    if (d.footer) out.footer = d.footer;
    if (d.image) out.image = d.image;
    if (d.thumbnail) out.thumbnail = d.thumbnail;
    if (d.fields?.length) out.fields = d.fields;
    return out;
  }

  /**
   * Copy request fields only. Response video/audio/type/provider are ignored.
   * Accepts wire {@link APIEmbed} / {@link RESTPostAPIEmbed} or a camelCase received embed.
   * @param data - API embed from message or webhook
   * @returns New builder instance with copied data
   */
  static from(data: APIEmbed | RESTPostAPIEmbed | EmbedFromInput): EmbedBuilder {
    const b = new EmbedBuilder();
    if (data.title != null) b.data.title = data.title;
    if (data.description != null) b.data.description = data.description;
    if (data.url != null) b.data.url = data.url;
    if (data.color != null) b.data.color = data.color;
    if (data.timestamp != null) {
      b.data.timestamp =
        data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp;
    }
    if (data.author?.name) {
      const author: RESTPostAPIEmbedAuthor = { name: data.author.name };
      if (data.author.url) author.url = data.author.url;
      const icon = iconUrlOf(data.author);
      if (icon) author.icon_url = icon;
      b.data.author = author;
    }
    if (data.footer?.text) {
      const footer: RESTPostAPIEmbedFooter = { text: data.footer.text };
      const icon = iconUrlOf(data.footer);
      if (icon) footer.icon_url = icon;
      b.data.footer = footer;
    }
    if (data.image?.url) {
      b.data.image = { url: data.image.url, description: data.image.description };
    }
    if (data.thumbnail?.url) {
      b.data.thumbnail = { url: data.thumbnail.url, description: data.thumbnail.description };
    }
    if (data.fields?.length) b.data.fields = data.fields;
    return b;
  }
}
