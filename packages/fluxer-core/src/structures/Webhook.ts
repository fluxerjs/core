import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { APIEmbed, APIMessage } from '@fluxerjs/types';
import { APIWebhook, APIWebhookUpdateRequest, APIWebhookTokenUpdateRequest } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { EmbedBuilder } from '@fluxerjs/builders';
import { buildSendBody, resolveMessageFiles, type MessageFileData } from '../util/messageUtils.js';
import { Message } from './Message.js';
import { User } from './User.js';
import { cdnAvatarURL } from '../util/cdn.js';

/** File data for webhook attachment uploads. Use `data` for buffers or `url` to fetch from a URL. */
export type WebhookFileData = MessageFileData;

/** Attachment metadata for webhook file uploads (id matches FormData index). */
export interface WebhookAttachmentMeta {
  id: number;
  filename: string;
  title?: string | null;
  description?: string | null;
  /** MessageAttachmentFlags: IS_SPOILER (8), CONTAINS_EXPLICIT_MEDIA (16), IS_ANIMATED (32) */
  flags?: number;
}

/** Options for sending a message via webhook. Aligns with WebhookMessageRequest in the API. */
export interface WebhookSendOptions {
  /** Message text content (up to 2000 characters) */
  content?: string;
  /** Embed objects. Use EmbedBuilder or APIEmbed; EmbedBuilder is serialized automatically. */
  embeds?: (APIEmbed | EmbedBuilder)[];
  /** Override the webhook's default username for this message */
  username?: string;
  /** Override the webhook's default avatar URL for this message */
  avatar_url?: string;
  /** Text-to-speech */
  tts?: boolean;
  /** File attachments. When present, uses multipart/form-data (same as channel.send). */
  files?: WebhookFileData[];
  /** Attachment metadata for files (id = index). Use when files are provided. */
  attachments?: WebhookAttachmentMeta[];
}

/**
 * Represents a Discord/Fluxer webhook. Supports creating, fetching, sending, and deleting.
 * The token is only available when the webhook was created; fetched webhooks cannot send messages.
 */
export class Webhook extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  channelId: string;
  name: string;
  avatar: string | null;
  /** Present only when webhook was created via createWebhook(); not returned when fetching. */
  readonly token: string | null;
  /** User who created the webhook. */
  readonly user: User;

  /** @param data - API webhook from POST /channels/{id}/webhooks (has token) or GET /webhooks/{id} (no token) */
  constructor(client: Client, data: APIWebhook & { token?: string | null }) {
    super();
    this.client = client;
    this.id = data.id;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    this.name = data.name ?? 'Unknown';
    this.avatar = data.avatar ?? null;
    this.token = data.token ?? null;
    this.user = client.getOrCreateUser(data.user);
  }

  /**
   * Get the URL for this webhook's avatar.
   * Returns null if the webhook has no custom avatar.
   */
  avatarURL(options?: { size?: number; extension?: string }): string | null {
    return cdnAvatarURL(this.id, this.avatar, options);
  }

  /** Delete this webhook. Requires bot token with Manage Webhooks permission. */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.webhook(this.id), { auth: true });
  }

  /**
   * Edit this webhook. With token: name and avatar only. Without token (bot auth): name, avatar, and channel_id.
   * @param options - Fields to update (name, avatar, channel_id when using bot auth)
   * @returns This webhook instance with updated fields
   */
  async edit(options: APIWebhookUpdateRequest | APIWebhookTokenUpdateRequest): Promise<Webhook> {
    const body: Record<string, unknown> = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.avatar !== undefined) body.avatar = options.avatar;
    if ('channel_id' in options && options.channel_id !== undefined && !this.token) {
      body.channel_id = options.channel_id;
    }

    if (this.token) {
      const data = await this.client.rest.patch(Routes.webhookExecute(this.id, this.token), {
        body,
        auth: false,
      });
      const w = data as APIWebhook;
      this.name = w.name ?? this.name;
      this.avatar = w.avatar ?? null;
      return this;
    }

    const data = await this.client.rest.patch(Routes.webhook(this.id), {
      body,
      auth: true,
    });
    const w = data as APIWebhook;
    this.name = w.name ?? this.name;
    this.avatar = w.avatar ?? null;
    this.channelId = w.channel_id ?? this.channelId;
    return this;
  }

  /**
   * Send a message via this webhook. Requires the webhook token (only present when created, not when fetched).
   * @param options - Text content or object with content, embeds, username, avatar_url, tts, files, attachments
   * @param wait - If true, waits for the API and returns the created Message; otherwise returns void (204)
   * @throws Error if token is not available
   * @example
   * await webhook.send('Hello!');
   * await webhook.send({ embeds: [embed] });
   * await webhook.send({ content: 'File attached', files: [{ name: 'data.txt', data: buffer }] });
   * const msg = await webhook.send({ content: 'Hi' }, true);
   */
  async send(options: string | WebhookSendOptions, wait?: boolean): Promise<Message | undefined> {
    if (!this.token) {
      throw new Error(
        'Webhook token is required to send. The token is only returned when creating a webhook; fetched webhooks cannot send.',
      );
    }
    const opts = typeof options === 'string' ? { content: options } : options;

    // Use same body-building flow as ChannelManager.send / message send
    const body = buildSendBody(options) as Record<string, unknown>;
    if (opts.username !== undefined) body.username = opts.username;
    if (opts.avatar_url !== undefined) body.avatar_url = opts.avatar_url;
    if (opts.tts !== undefined) body.tts = opts.tts;

    const route = Routes.webhookExecute(this.id, this.token) + (wait ? '?wait=true' : '');

    // Same pattern as ChannelManager: { body, files } when files present (URLs resolved automatically)
    const files = opts.files?.length ? await resolveMessageFiles(opts.files) : undefined;
    const postOptions = files?.length
      ? { body, files, auth: false as const }
      : { body, auth: false as const };

    const data = await this.client.rest.post<APIMessage | undefined>(route, postOptions);

    if (wait && data) {
      return new Message(this.client, data);
    }
    return undefined;
  }

  /**
   * Fetch a webhook by ID using bot auth.
   * @param client - The client instance
   * @param webhookId - The webhook ID
   * @returns Webhook without token (cannot send)
   */
  static async fetch(client: Client, webhookId: string): Promise<Webhook> {
    const data = await client.rest.get(Routes.webhook(webhookId));
    return new Webhook(client, data as APIWebhook);
  }

  /**
   * Create a Webhook instance from an ID and token (e.g. from a stored webhook URL).
   * @param client - The client instance
   * @param webhookId - The webhook ID
   * @param token - The webhook token (from createWebhook or stored)
   * @param options - Optional channelId, guildId, name for display
   */
  static fromToken(
    client: Client,
    webhookId: string,
    token: string,
    options?: { channelId?: string; guildId?: string; name?: string },
  ): Webhook {
    return new Webhook(client, {
      id: webhookId,
      guild_id: options?.guildId ?? '',
      channel_id: options?.channelId ?? '',
      name: options?.name ?? 'Webhook',
      avatar: null,
      token,
      user: { id: '', username: 'webhook', discriminator: '0' },
    });
  }
}
