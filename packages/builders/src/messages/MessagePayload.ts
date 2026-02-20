import { APIEmbed, APIMessageReference } from '@fluxerjs/types';
import { EmbedBuilder } from './EmbedBuilder.js';
import { AttachmentBuilder } from './AttachmentBuilder.js';

/** Data for a message payload (content, embeds, reply reference, etc.). */
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

/** Builder for message payloads. Use with `channel.send()` or `message.reply()`. */
export class MessagePayload {
  public static readonly ContentMaxLength = CONTENT_MAX;

  public readonly data: MessagePayloadData = {};

  /** Set message text. Max 2000 characters. */
  setContent(content: string | null): this {
    if (content !== null && content.length > CONTENT_MAX)
      throw new RangeError(`Content must be ≤${CONTENT_MAX} characters`);
    this.data.content = content ?? undefined;
    return this;
  }

  /** Set embeds. Max 10. Replaces existing. */
  setEmbeds(embeds: (APIEmbed | EmbedBuilder)[] | null): this {
    if (!embeds?.length) {
      this.data.embeds = undefined;
      return this;
    }
    if (embeds.length > EMBEDS_MAX) throw new RangeError(`Embeds must be ≤${EMBEDS_MAX}`);
    this.data.embeds = embeds.map((e) => (e instanceof EmbedBuilder ? e.toJSON() : e));
    return this;
  }

  /** Add one embed. Max 10 total. */
  addEmbed(embed: APIEmbed | EmbedBuilder): this {
    const list = (this.data.embeds ?? []).slice();
    if (list.length >= EMBEDS_MAX) throw new RangeError(`Embeds must be ≤${EMBEDS_MAX}`);
    list.push(embed instanceof EmbedBuilder ? embed.toJSON() : embed);
    this.data.embeds = list;
    return this;
  }

  /** Set attachment metadata (for files sent with the request). */
  setAttachments(
    attachments: Array<
      AttachmentBuilder | { id: number; filename: string; description?: string | null }
    > | null,
  ): this {
    if (!attachments?.length) {
      this.data.attachments = undefined;
      return this;
    }
    this.data.attachments = attachments.map((a) =>
      a instanceof AttachmentBuilder ? a.toJSON() : a,
    );
    return this;
  }

  /** Set reply reference (creates a reply to another message). */
  setReply(
    reference:
      | { channel_id: string; message_id: string; guild_id?: string | null }
      | APIMessageReference
      | null,
  ): this {
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

  /** Enable text-to-speech. */
  setTTS(tts: boolean): this {
    this.data.tts = tts;
    return this;
  }

  /** Set message flags (e.g. ephemeral, suppress embeds). */
  setFlags(flags: number): this {
    this.data.flags = flags;
    return this;
  }

  /** Get the payload as a plain object. */
  toJSON(): MessagePayloadData {
    return { ...this.data };
  }

  /** Create a MessagePayload from a string or options object. */
  static create(contentOrOptions?: string | MessagePayloadData): MessagePayload {
    const payload = new MessagePayload();
    if (typeof contentOrOptions === 'string') {
      payload.setContent(contentOrOptions);
    } else if (contentOrOptions && typeof contentOrOptions === 'object') {
      if (contentOrOptions.content !== undefined)
        payload.setContent(contentOrOptions.content ?? null);
      if (contentOrOptions.embeds?.length) payload.setEmbeds(contentOrOptions.embeds);
      if (contentOrOptions.attachments?.length)
        payload.setAttachments(contentOrOptions.attachments);
      if (contentOrOptions.message_reference)
        payload.setReply(contentOrOptions.message_reference as APIMessageReference);
      if (contentOrOptions.tts !== undefined) payload.setTTS(contentOrOptions.tts);
      if (contentOrOptions.flags !== undefined) payload.setFlags(contentOrOptions.flags);
    }
    return payload;
  }
}
