import type { Collection } from '@fluxerjs/collection';
import type {
  APIChannel,
  APIChannelPartial,
  APIChannelSlowmodeState,
  APIRtcRegion,
  RESTPostAPIChannelAttachmentCompleteResponse,
  RESTPostAPIChannelAttachmentUploadResponse,
} from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';
import { SnowflakeUtil } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import { MessageManager } from '../../ClientCore/MessageManager.js';
import {
  type AttachmentUploadCompleteItem,
  type AttachmentUploadCompleteResponse,
  type AttachmentUploadPlanItem,
  type AttachmentUploadPlanResponse,
  type ChannelSlowmodePayload,
  type RtcRegionPayload,
  type SudoVerificationOptions,
  toAttachmentUploadCompleteBody,
  toAttachmentUploadPlanBody,
  toAttachmentUploadPlanResponse,
  toSudoBody,
} from '../../ClientCore/SdkOptions/index.js';
import {
  MessageCollector,
  type MessageCollectorEndReason,
  type MessageCollectorOptions,
} from '../../Helpers/MessageCollector.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { FluxerError } from '../../LibErrors/FluxerError.js';
import { Base } from '../Base.js';
import type { Message } from '../Message/index.js';
import { type UploadFileForSend, uploadAttachmentsForSend } from './Attachments.js';
import type { DMChannel } from './Dm.js';
import type {
  CategoryChannel,
  GuildChannel,
  LinkChannel,
  TextChannel,
  VoiceChannel,
} from './Guild.js';

/**
 * Base class for all channel types.
 * `client.channels.fetch` and `message.resolveChannel` return this type; call `delete` on it.
 * Text-capable channels (`isTextBased`) also have `send`.
 * Narrow with `isTextBased` / `isGuild`.
 */
export abstract class Channel extends Base {
  #messages: MessageManager | undefined;
  /** The {@link Client} that instantiated this channel. */
  readonly client: Client;
  /** Snowflake ID of this channel. */
  readonly id: string;
  /** Channel type (text, voice, category, etc.). */
  type: ChannelType;
  /** Channel name (null for some channel types). */
  name: string | null;
  /** Channel icon hash (null for most channel types). */
  icon: string | null;
  /** ISO8601 timestamp of the last pinned message update. */
  lastPinTimestamp: string | null;

  constructor(client: Client, data: APIChannelPartial) {
    super();
    this.client = client;
    this.id = data.id;
    this.type = data.type;
    this.name = data.name ?? null;
    this.icon = data.icon ?? null;
    this.lastPinTimestamp = (data as APIChannel).last_pin_timestamp ?? null;
  }

  /** Unix timestamp (ms) when this channel was created, derived from its snowflake ID. */
  get createdTimestamp(): number {
    return SnowflakeUtil.timestampFromSnowflake(this.id);
  }

  /** Date when this channel was created, derived from its snowflake ID. */
  get createdAt(): Date {
    return SnowflakeUtil.dateFromSnowflake(this.id);
  }

  /**
   * Apply shared channel fields in place (gateway CHANNEL_UPDATE when type is unchanged).
   * @internal
   */
  _patch(data: APIChannelPartial | APIChannel): void {
    if (data.type !== undefined) this.type = data.type as ChannelType;
    if (data.name !== undefined) this.name = data.name ?? null;
    if (data.icon !== undefined) this.icon = data.icon ?? null;
    if ('last_pin_timestamp' in data && data.last_pin_timestamp !== undefined) {
      this.lastPinTimestamp = data.last_pin_timestamp ?? null;
    }
  }

  /** @internal Factory wired after subclasses load. */
  static from(_c: Client, _d: APIChannel | APIChannelPartial): GuildChannel | TextChannel {
    throw new Error('Channel.from not initialized');
  }
  /** @internal Factory wired after subclasses load. */
  static fromOrCreate(
    _c: Client,
    _d: APIChannel | APIChannelPartial,
  ): TextChannel | DMChannel | GuildChannel {
    throw new Error('Channel.fromOrCreate not initialized');
  }
  /** @internal Factory wired after subclasses load. */
  static createDM(_c: Client, _d: APIChannelPartial): DMChannel {
    throw new Error('Channel.createDM not initialized');
  }

  /**
   * Whether this channel type can carry messages (text, voice, DM, group DM, notes).
   * Checks {@link ChannelType}, not whether `send` exists on the instance.
   */
  isTextBased(): this is TextChannel | VoiceChannel | DMChannel {
    return (
      this.type === ChannelType.GuildText ||
      this.type === ChannelType.GuildVoice ||
      this.type === ChannelType.DM ||
      this.type === ChannelType.GroupDM ||
      this.type === ChannelType.DMPersonalNotes
    );
  }
  /** Check if this is a guild channel (text, voice, category, or link). */
  isGuild(): this is GuildChannel {
    return (
      this.type === ChannelType.GuildText ||
      this.type === ChannelType.GuildVoice ||
      this.type === ChannelType.GuildCategory ||
      this.type === ChannelType.GuildLink
    );
  }
  /** Check if this is a guild text channel. */
  isText(): this is TextChannel {
    return this.type === ChannelType.GuildText;
  }
  /** Check if this is a category channel. */
  isCategory(): this is CategoryChannel {
    return this.type === ChannelType.GuildCategory;
  }
  /** Check if this is a DM, group DM, or personal notes channel. */
  isDM(): this is DMChannel {
    return (
      this.type === ChannelType.DM ||
      this.type === ChannelType.GroupDM ||
      this.type === ChannelType.DMPersonalNotes
    );
  }
  /** Check if this is a personal notes channel. */
  isPersonalNotes(): boolean {
    return this.type === ChannelType.DMPersonalNotes;
  }
  /** Check if this is a voice channel. */
  isVoice(): this is VoiceChannel {
    return this.type === ChannelType.GuildVoice;
  }
  /** Check if this is a link channel. */
  isLink(): this is LinkChannel {
    return this.type === ChannelType.GuildLink;
  }

  /**
   * Delete recent messages or an explicit ID list.
   * - `bulkDelete(5)` — fetch last 5 via {@link MessageManager} then delete (1–100)
   * - `bulkDelete(['id1'])` — single DELETE; 2–100 uses bulk-delete route
   */
  async bulkDelete(countOrIds: number | readonly string[]): Promise<string[]> {
    let ids: string[];
    if (typeof countOrIds === 'number') {
      if (!Number.isInteger(countOrIds) || countOrIds < 1 || countOrIds > 100) {
        throw new FluxerError('bulkDelete count must be between 1 and 100', {
          code: ErrorCodes.InvalidBulkDelete,
        });
      }
      ids = [
        ...(await new MessageManager(this.client, this.id).fetch({ limit: countOrIds })).keys(),
      ];
    } else {
      ids = [...countOrIds];
    }
    if (ids.length === 0) return [];
    if (ids.length === 1) {
      await this.client.rest.delete(Routes.channelMessage(this.id, ids[0]!), { auth: true });
      this.client._removeMessageFromCache(this.id, ids[0]!);
      return ids;
    }
    if (ids.length > 100) {
      throw new FluxerError('bulkDelete requires at most 100 message IDs', {
        code: ErrorCodes.InvalidBulkDelete,
      });
    }
    await this.client.rest.post(Routes.channelBulkDelete(this.id), {
      body: { message_ids: ids },
      auth: true,
    });
    for (const id of ids) this.client._removeMessageFromCache(this.id, id);
    return ids;
  }

  /** Delete all messages sent by the bot in this channel. Sudo auto-passes for bots. */
  async bulkDeleteMyMessages(options?: SudoVerificationOptions): Promise<void> {
    const body = options ? toSudoBody(options) : undefined;
    await this.client.rest.post(Routes.channelBulkDeleteMine(this.id), {
      body: body && Object.keys(body).length ? body : undefined,
      auth: true,
    });
  }

  /**
   * Mark all pinned messages as read in this channel.
   * Session-token helper; bots usually skip this.
   */
  async acknowledgePins(): Promise<void> {
    await this.client.rest.post(Routes.channelPinsAck(this.id), { auth: true });
  }

  /**
   * Clear the read state for this channel.
   * Session-token helper; bots usually skip this.
   */
  async clearReadState(): Promise<void> {
    await this.client.rest.delete(Routes.channelMessagesAck(this.id), { auth: true });
  }

  /** Request upload URLs for attachments before sending a message. */
  async requestAttachmentUploads(
    attachments: AttachmentUploadPlanItem[],
  ): Promise<AttachmentUploadPlanResponse> {
    const data = await this.client.rest.post<RESTPostAPIChannelAttachmentUploadResponse>(
      Routes.channelAttachments(this.id),
      {
        body: toAttachmentUploadPlanBody(attachments),
        auth: true,
      },
    );
    return toAttachmentUploadPlanResponse(data);
  }

  /** Complete the attachment upload flow after uploading to the CDN. */
  async completeAttachmentUploads(
    uploads: AttachmentUploadCompleteItem[],
  ): Promise<AttachmentUploadCompleteResponse> {
    const data = await this.client.rest.post<RESTPostAPIChannelAttachmentCompleteResponse>(
      Routes.channelAttachmentsComplete(this.id),
      {
        body: toAttachmentUploadCompleteBody(uploads),
        auth: true,
      },
    );
    return {
      uploads: data.uploads.map((u) => ({ uploadFilename: u.upload_filename })),
    };
  }

  /** Upload files for sending in a message (helper). */
  async uploadAttachmentsForSend(files: UploadFileForSend[]) {
    return uploadAttachmentsForSend(this.client, this.id, files);
  }

  /** Trigger the typing indicator in this channel. */
  async sendTyping(): Promise<void> {
    await this.client.rest.post(Routes.channelTyping(this.id), { auth: true });
  }

  /**
   * Fetch available RTC regions for voice channels.
   * User-account only (`DefaultUserOnly`); bots receive `AccessDeniedError`.
   * Bots should skip this and join voice with `@fluxerjs/voice` instead.
   */
  async fetchRtcRegions(): Promise<RtcRegionPayload[]> {
    const data = await this.client.rest.get<APIRtcRegion[]>(Routes.channelRtcRegions(this.id), {
      auth: true,
    });
    return data.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji }));
  }

  /** Fetch slowmode state for this channel. */
  async fetchSlowmode(): Promise<ChannelSlowmodePayload> {
    const data = await this.client.rest.get<APIChannelSlowmodeState>(
      Routes.channelSlowmode(this.id),
      { auth: true },
    );
    return {
      rateLimitPerUser: data.rate_limit_per_user,
      retryAfterMs: data.retry_after_ms,
      nextSendAllowedAt: data.next_send_allowed_at,
    };
  }

  /** Whether this channel type can carry messages (does not check permissions). */
  canSendMessage(): boolean {
    return this.isTextBased();
  }

  /** Per-channel message cache + fetch. */
  get messages(): MessageManager {
    if (!this.#messages) {
      this.#messages = new MessageManager(this.client, this.id);
    }
    return this.#messages;
  }

  /** Collect messages in this channel until time/max/stop. */
  createMessageCollector(options?: MessageCollectorOptions): MessageCollector {
    return new MessageCollector(this.client, this.id, options);
  }

  /**
   * Wait for messages matching the filter, then resolve the collected set.
   * Pass `errors: ['time']` to reject when the timer fires instead of resolving.
   * @example
   * const collected = await channel.awaitMessages({ max: 1, time: 15_000 });
   */
  awaitMessages(
    options?: MessageCollectorOptions & { errors?: MessageCollectorEndReason[] },
  ): Promise<Collection<string, Message>> {
    return MessageCollector.awaitMessages(this.client, this.id, options);
  }

  /**
   * Delete this channel (or close it if it is a DM).
   * Guild channels require Manage Channels. `silent` / `deleteMessages` are Fluxer query params.
   * @example
   * const channel = await client.channels.fetch(channelId);
   * await channel.delete();
   */
  async delete(
    options?: SudoVerificationOptions & { silent?: boolean; deleteMessages?: boolean },
  ): Promise<void> {
    const params = new URLSearchParams();
    if (options?.silent) params.set('silent', 'true');
    if (options?.deleteMessages) params.set('delete_messages', 'true');
    const qs = params.toString();
    const { silent: _s, deleteMessages: _d, ...sudo } = options ?? {};
    const body = Object.keys(sudo).length ? toSudoBody(sudo) : undefined;
    await this.client.rest.delete(Routes.channel(this.id) + (qs ? `?${qs}` : ''), {
      body,
      auth: true,
    });
    this.client.channels.delete(this.id);
    this.client._clearMessageCache(this.id);
    if (this.isGuild() && this.guildId) {
      this.client.guilds.get(this.guildId)?.channels.delete(this.id);
    }
  }

  /** Channel mention (`<#id>`). */
  toString(): string {
    return `<#${this.id}>`;
  }
}
