import { APIEmbed, APIEmbedAuthor, APIEmbedFooter, APIEmbedMedia } from '@fluxerjs/types';
import { resolveColor } from '@fluxerjs/util';

/** Options for embed media (image, thumbnail, video, audio). */
export interface EmbedMediaOptions {
  url: string;
  content_type?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  placeholder?: string | null;
  duration?: number | null;
  flags?: number | null;
}

const EMBED_MAX = {
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footerText: 2048,
  authorName: 256,
  total: 6000,
};

function toEmbedMedia(input: string | EmbedMediaOptions): APIEmbedMedia {
  if (typeof input === 'string') {
    return { url: input };
  }
  if (!URL.canParse(input.url)) {
    throw new Error('Invalid embed media URL');
  }
  const media: APIEmbedMedia = { url: input.url };
  if (input.content_type != null) media.content_type = input.content_type;
  if (input.width != null) media.width = input.width;
  if (input.height != null) media.height = input.height;
  if (input.description != null) media.description = input.description;
  if (input.placeholder != null) media.placeholder = input.placeholder;
  if (input.duration != null) media.duration = input.duration;
  if (input.flags != null) media.flags = input.flags;
  return media;
}

/** Author field for an embed. */
export interface EmbedAuthorOptions {
  name: string;
  iconURL?: string;
  url?: string;
}

/** Footer field for an embed. */
export interface EmbedFooterOptions {
  text: string;
  iconURL?: string;
}

/** A single embed field (name, value, optional inline). */
export interface EmbedFieldData {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Builder for creating rich embeds. Use `toJSON()` when passing to `reply`, `send`, or `edit`.
 * Embeds must have at least one of: title, description, fields, or image/thumbnail.
 * A description-only embed (no title) is valid.
 */
export class EmbedBuilder {
  public readonly data: Partial<APIEmbed> = {};

  /** Set the embed title. Max 256 characters. */
  setTitle(title: string | null): this {
    if (title !== null && title.length > EMBED_MAX.title)
      throw new RangeError(`Title must be ≤${EMBED_MAX.title} characters`);
    this.data.title = title ?? undefined;
    return this;
  }

  /** Set the embed description. Max 4096 characters. */
  setDescription(description: string | null): this {
    if (description !== null && description.length > EMBED_MAX.description)
      throw new RangeError(`Description must be ≤${EMBED_MAX.description} characters`);
    this.data.description = description ?? undefined;
    return this;
  }

  /** Set the embed URL (title becomes a link). */
  setURL(url: string | null): this {
    if (url != null && url !== '' && !URL.canParse(url)) {
      throw new Error('Invalid embed URL');
    }
    this.data.url = url ?? undefined;
    return this;
  }

  /** Set the embed color. Number (hex), hex string, or `[r,g,b]` array. */
  setColor(color: number | string | [number, number, number] | null): this {
    if (color === null) {
      this.data.color = undefined;
      return this;
    }
    this.data.color = typeof color === 'number' ? color : resolveColor(color);
    return this;
  }

  /** Set the embed timestamp. Omit for current time. */
  setTimestamp(timestamp?: Date | number | null): this {
    if (timestamp === undefined || timestamp === null) {
      this.data.timestamp = undefined;
      return this;
    }
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    this.data.timestamp = date.toISOString();
    return this;
  }

  /** Set the embed author (name, optional icon URL and link). */
  setAuthor(options: EmbedAuthorOptions | null): this {
    if (!options) {
      this.data.author = undefined;
      return this;
    }
    const name = options.name.slice(0, EMBED_MAX.authorName);
    const author: APIEmbedAuthor = { name };
    if (options.url) author.url = options.url;
    if (options.iconURL) author.icon_url = options.iconURL;
    this.data.author = author;
    return this;
  }

  /** Set the embed footer (text, optional icon URL). */
  setFooter(options: EmbedFooterOptions | null): this {
    if (!options) {
      this.data.footer = undefined;
      return this;
    }
    const text = options.text.slice(0, EMBED_MAX.footerText);
    const footer: APIEmbedFooter = { text };
    if (options.iconURL) footer.icon_url = options.iconURL;
    this.data.footer = footer;
    return this;
  }

  /** Set the embed image (URL string or full media options). */
  setImage(input: string | EmbedMediaOptions | null): this {
    this.data.image = input ? toEmbedMedia(input) : undefined;
    return this;
  }

  /** Set the embed thumbnail (URL string or full media options). */
  setThumbnail(input: string | EmbedMediaOptions | null): this {
    this.data.thumbnail = input ? toEmbedMedia(input) : undefined;
    return this;
  }

  /**
   * Set the embed video. Supported by Fluxer.
   * Embed stays type 'rich'; this adds the .video field.
   * Include a title (e.g. setTitle) when using video.
   *
   * @param input - Video URL, full media options (e.g. duration for progress bars), or null to clear
   */
  setVideo(input: string | EmbedMediaOptions | null): this {
    this.data.video = input ? toEmbedMedia(input) : undefined;
    return this;
  }

  /**
   * Set the embed audio. Supported by Fluxer.
   *
   * @param input - Audio URL, full media options, or null to clear
   */
  setAudio(input: string | EmbedMediaOptions | null): this {
    this.data.audio = input ? toEmbedMedia(input) : undefined;
    return this;
  }

  /** Add one or more fields. Max 25 fields. */
  addFields(...fields: EmbedFieldData[]): this {
    const current = (this.data.fields ?? []).slice();
    for (const f of fields) {
      if (current.length >= EMBED_MAX.fields) break;
      current.push({
        name: f.name.slice(0, EMBED_MAX.fieldName),
        value: f.value.slice(0, EMBED_MAX.fieldValue),
        inline: f.inline,
      });
    }
    this.data.fields = current.length ? current : undefined;
    return this;
  }

  spliceFields(index: number, deleteCount: number, ...fields: EmbedFieldData[]): this {
    const current = (this.data.fields ?? []).slice();
    const toAdd = fields.map((f) => ({
      name: f.name.slice(0, EMBED_MAX.fieldName),
      value: f.value.slice(0, EMBED_MAX.fieldValue),
      inline: f.inline,
    }));
    current.splice(index, deleteCount, ...toAdd);
    this.data.fields = current.length ? current : undefined;
    return this;
  }

  /** Convert to API embed format for `reply`, `send`, or `edit`. */
  toJSON(): APIEmbed {
    const totalLength = [
      this.data.title,
      this.data.description,
      ...(this.data.fields ?? []).flatMap((f) => [f.name, f.value]),
      this.data.footer?.text,
    ]
      .filter(Boolean)
      .join('').length;
    if (totalLength > EMBED_MAX.total)
      throw new RangeError(`Embed total length must be ≤${EMBED_MAX.total}`);
    return { ...this.data, type: 'rich' } as APIEmbed;
  }

  /** Create an EmbedBuilder from an existing API embed. */
  static from(data: APIEmbed): EmbedBuilder {
    const b = new EmbedBuilder();
    b.data.title = data.title ?? undefined;
    b.data.description = data.description ?? undefined;
    b.data.url = data.url ?? undefined;
    b.data.color = data.color ?? undefined;
    b.data.timestamp = data.timestamp ?? undefined;
    b.data.author = data.author ?? undefined;
    b.data.footer = data.footer ?? undefined;
    b.data.image = data.image ?? undefined;
    b.data.thumbnail = data.thumbnail ?? undefined;
    b.data.video = data.video ?? undefined;
    b.data.audio = data.audio ?? undefined;
    b.data.fields = data.fields ?? undefined;
    return b;
  }
}
