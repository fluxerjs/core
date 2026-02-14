import type { APIEmbed, APIEmbedAuthor, APIEmbedFooter, APIEmbedField, APIEmbedMedia } from '@fluxerjs/types';
import { resolveColor } from '@fluxerjs/util';

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

export interface EmbedAuthorOptions {
  name: string;
  iconURL?: string;
  url?: string;
}

export interface EmbedFooterOptions {
  text: string;
  iconURL?: string;
}

export interface EmbedFieldData {
  name: string;
  value: string;
  inline?: boolean;
}

export class EmbedBuilder {
  public readonly data: Partial<APIEmbed> = {};

  setTitle(title: string | null): this {
    if (title !== null && title.length > EMBED_MAX.title) throw new RangeError(`Title must be ≤${EMBED_MAX.title} characters`);
    this.data.title = title ?? undefined;
    return this;
  }

  setDescription(description: string | null): this {
    if (description !== null && description.length > EMBED_MAX.description) throw new RangeError(`Description must be ≤${EMBED_MAX.description} characters`);
    this.data.description = description ?? undefined;
    return this;
  }

  setURL(url: string | null): this {
    this.data.url = url ?? undefined;
    return this;
  }

  setColor(color: number | string | [number, number, number] | null): this {
    if (color === null) {
      this.data.color = undefined;
      return this;
    }
    this.data.color = typeof color === 'number' ? color : resolveColor(color);
    return this;
  }

  setTimestamp(timestamp?: Date | number | null): this {
    if (timestamp === undefined || timestamp === null) {
      this.data.timestamp = undefined;
      return this;
    }
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    this.data.timestamp = date.toISOString();
    return this;
  }

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

  setImage(url: string | null): this {
    this.data.image = url ? { url } : undefined;
    return this;
  }

  setThumbnail(url: string | null): this {
    this.data.thumbnail = url ? { url } : undefined;
    return this;
  }

  setVideo(url: string | null): this {
    this.data.video = url ? { url } : undefined;
    return this;
  }

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

  toJSON(): APIEmbed {
    const totalLength = [this.data.title, this.data.description, ...(this.data.fields ?? []).flatMap((f) => [f.name, f.value]), this.data.footer?.text].filter(Boolean).join('').length;
    if (totalLength > EMBED_MAX.total) throw new RangeError(`Embed total length must be ≤${EMBED_MAX.total}`);
    return { ...this.data, type: this.data.type ?? 'rich' } as APIEmbed;
  }

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
    b.data.fields = data.fields ?? undefined;
    b.data.type = data.type ?? 'rich';
    return b;
  }
}
