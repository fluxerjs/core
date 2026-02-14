import type { APIEmbed, APIMessageReference } from '@fluxerjs/types';
import { EmbedBuilder } from './EmbedBuilder.js';
import { AttachmentBuilder } from './AttachmentBuilder.js';

export interface MessagePayloadData {
  content?: string | null;
  embeds?: APIEmbed[] | null;
  attachments?: Array<{ id: number; filename: string; description?: string | null }>;
  message_reference?: APIMessageReference | null;
  tts?: boolean;
  flags?: number;
}

const CONTENT_MAX = 2000;
const EMBEDS_MAX = 10;

export class MessagePayload {
  public static readonly ContentMaxLength = CONTENT_MAX;

  public readonly data: MessagePayloadData = {};

  setContent(content: string | null): this {
    if (content !== null && content.length > CONTENT_MAX) throw new RangeError(`Content must be ≤${CONTENT_MAX} characters`);
    this.data.content = content ?? undefined;
    return this;
  }

  setEmbeds(embeds: (APIEmbed | EmbedBuilder)[] | null): this {
    if (!embeds?.length) {
      this.data.embeds = undefined;
      return this;
    }
    if (embeds.length > EMBEDS_MAX) throw new RangeError(`Embeds must be ≤${EMBEDS_MAX}`);
    this.data.embeds = embeds.map((e) => (e instanceof EmbedBuilder ? e.toJSON() : e));
    return this;
  }

  addEmbed(embed: APIEmbed | EmbedBuilder): this {
    const list = (this.data.embeds ?? []).slice();
    if (list.length >= EMBEDS_MAX) throw new RangeError(`Embeds must be ≤${EMBEDS_MAX}`);
    list.push(embed instanceof EmbedBuilder ? embed.toJSON() : embed);
    this.data.embeds = list;
    return this;
  }

  setAttachments(attachments: Array<AttachmentBuilder | { id: number; filename: string; description?: string | null }> | null): this {
    if (!attachments?.length) {
      this.data.attachments = undefined;
      return this;
    }
    this.data.attachments = attachments.map((a) => (a instanceof AttachmentBuilder ? a.toJSON() : a));
    return this;
  }

  setReply(reference: { channel_id: string; message_id: string; guild_id?: string | null } | APIMessageReference | null): this {
    if (!reference) {
      this.data.message_reference = undefined;
      return this;
    }
    this.data.message_reference = {
      channel_id: reference.channel_id,
      message_id: reference.message_id,
      guild_id: reference.guild_id ?? undefined,
    };
    return this;
  }

  setTTS(tts: boolean): this {
    this.data.tts = tts;
    return this;
  }

  setFlags(flags: number): this {
    this.data.flags = flags;
    return this;
  }

  toJSON(): MessagePayloadData {
    return { ...this.data };
  }

  static create(contentOrOptions?: string | MessagePayloadData): MessagePayload {
    const payload = new MessagePayload();
    if (typeof contentOrOptions === 'string') {
      payload.setContent(contentOrOptions);
    } else if (contentOrOptions && typeof contentOrOptions === 'object') {
      if (contentOrOptions.content !== undefined) payload.setContent(contentOrOptions.content ?? null);
      if (contentOrOptions.embeds?.length) payload.setEmbeds(contentOrOptions.embeds);
      if (contentOrOptions.attachments?.length) payload.setAttachments(contentOrOptions.attachments);
      if (contentOrOptions.message_reference) payload.setReply(contentOrOptions.message_reference as APIMessageReference);
      if (contentOrOptions.tts !== undefined) payload.setTTS(contentOrOptions.tts);
      if (contentOrOptions.flags !== undefined) payload.setFlags(contentOrOptions.flags);
    }
    return payload;
  }
}
