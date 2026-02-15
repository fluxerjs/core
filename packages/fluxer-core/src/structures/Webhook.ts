import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type {
  APIWebhook,
  APIWebhookUpdateRequest,
  APIWebhookTokenUpdateRequest,
} from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';

/** Options for sending a message via webhook. */
export interface WebhookSendOptions {
  /** Message text content */
  content?: string;
  /** Embed objects (use EmbedBuilder.toJSON()) */
  embeds?: Array<Record<string, unknown>>;
  /** Override the webhook's default username */
  username?: string;
  /** Override the webhook's default avatar URL */
  avatar_url?: string;
  /** Text-to-speech */
  tts?: boolean;
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
   * @throws Error if token is not available
   */
  async send(options: string | WebhookSendOptions): Promise<void> {
    if (!this.token) {
      throw new Error(
        'Webhook token is required to send. The token is only returned when creating a webhook; fetched webhooks cannot send.'
      );
    }
    const body = typeof options === 'string' ? { content: options } : options;
    await this.client.rest.post(Routes.webhookExecute(this.id, this.token), {
      body,
      auth: false,
    });
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
    options?: { channelId?: string; guildId?: string; name?: string }
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
