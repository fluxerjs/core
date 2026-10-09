import { EmbedBuilder } from '@fluxerjs/builders';
import {
  type APIMessage,
  type APIWebhook,
  type APIWebhookUpdateRequest,
  type RESTPostAPIEmbed,
  Routes,
  WebhookType,
} from '@fluxerjs/types';

import { SnowflakeUtil } from '@fluxerjs/util';
import type { Client } from '../ClientCore/Client.js';
import {
  type MessageAttachmentEdit,
  toMessageAttachmentEditWire,
  type WebhookEditOptions,
} from '../ClientCore/SdkOptions/index.js';
import { cdnAvatarURL } from '../Helpers/Cdn.js';
import {
  type AllowedMentionsOptions,
  type MessageAttachmentMeta,
  type MessageFileData,
  type MessageSendOptions,
  prepareMessagePostPayload,
  toAPIAllowedMentions,
} from '../Helpers/MessageUtils/index.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import { Base } from './Base.js';
import { Message } from './Message/index.js';
import type { User } from './User.js';

export type WebhookFileData = MessageFileData;
export type WebhookAttachmentMeta = MessageAttachmentMeta;

/** Execute-webhook options: shared message fields plus username/avatar overrides. */
export type WebhookSendOptions = Pick<
  MessageSendOptions,
  'content' | 'embeds' | 'tts' | 'allowedMentions' | 'files' | 'attachments'
> & {
  username?: string;
  avatarUrl?: string;
};

/** Edit a previously sent webhook message (`EmbedBuilder` values are serialized). */
export interface WebhookMessageEditOptions {
  content?: string | null;
  embeds?: (RESTPostAPIEmbed | EmbedBuilder)[];
  attachments?: MessageAttachmentEdit[];
  flags?: number;
  allowedMentions?: AllowedMentionsOptions;
}

/**
 * Incoming webhook. Token is only present after create / `fromToken`;
 * fetched webhooks use bot auth and cannot execute.
 * @see {@link Webhook.fromToken} to construct from URL
 * @see {@link Webhook.fetch} to fetch by ID with bot auth
 */
export class Webhook extends Base {
  /** Parent client instance. */
  readonly client: Client;
  /** Webhook snowflake ID. */
  readonly id: string;
  /** Guild this webhook belongs to. */
  readonly guildId: string;
  /** Channel this webhook posts to. */
  channelId: string;
  /** Webhook name. */
  name: string;
  /** Webhook avatar hash (null = default). */
  avatar: string | null;
  /** Present after create / `fromToken`; omitted when fetching by ID. */
  readonly token: string | null;
  /** The user that created this webhook. */
  readonly user: User;
  /** Incoming or channel-follower webhook. */
  readonly type: WebhookType;

  constructor(client: Client, data: APIWebhook & { token?: string | null; type?: WebhookType }) {
    super();
    this.client = client;
    this.id = data.id;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    this.name = data.name ?? 'Unknown';
    this.avatar = data.avatar ?? null;
    this.token = data.token ?? null;
    this.user = client.getOrCreateUser(data.user);
    this.type = data.type ?? WebhookType.Incoming;
  }

  avatarURL(options?: { size?: number; extension?: string }): string | null {
    return cdnAvatarURL(this.id, this.avatar, {
      ...options,
      mediaBase: this.client.instance.endpoints.media,
    });
  }

  /** Unix timestamp (ms) when this webhook was created, derived from its snowflake ID. */
  get createdTimestamp(): number {
    return SnowflakeUtil.timestampFromSnowflake(this.id);
  }

  /** Date when this webhook was created, derived from its snowflake ID. */
  get createdAt(): Date {
    return SnowflakeUtil.dateFromSnowflake(this.id);
  }

  /** Delete this webhook (token auth when available, otherwise bot auth). */
  async delete(): Promise<void> {
    if (this.token) {
      await this.client.rest.delete(Routes.webhookExecute(this.id, this.token), { auth: false });
      return;
    }
    await this.client.rest.delete(Routes.webhook(this.id), { auth: true });
  }

  /**
   * Edit name/avatar. With bot auth (no token), `channelId` may also be set.
   */
  async edit(options: WebhookEditOptions): Promise<this> {
    const body: APIWebhookUpdateRequest = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.avatar !== undefined) body.avatar = options.avatar;
    if (!this.token && options.channelId !== undefined) {
      body.channel_id = options.channelId;
    }

    const data = this.token
      ? await this.client.rest.patch<APIWebhook>(Routes.webhookExecute(this.id, this.token), {
          body,
          auth: false,
        })
      : await this.client.rest.patch<APIWebhook>(Routes.webhook(this.id), { body, auth: true });

    this.name = data.name ?? this.name;
    this.avatar = data.avatar ?? null;
    if (!this.token) this.channelId = data.channel_id ?? this.channelId;
    return this;
  }

  /**
   * Execute the webhook. Requires token.
   * @param wait - When true, appends `?wait=true` and returns the created `Message`.
   */
  async send(options: string | WebhookSendOptions, wait = false): Promise<Message | undefined> {
    const token = this.requireToken();
    const overrides =
      typeof options === 'object'
        ? { username: options.username, avatarUrl: options.avatarUrl }
        : {};
    const messageOpts: string | MessageSendOptions =
      typeof options === 'string'
        ? options
        : (({ username: _u, avatarUrl: _a, ...rest }) => rest)(options);

    const { body, files } = await prepareMessagePostPayload(messageOpts);
    if (overrides.username !== undefined) {
      (body as Record<string, unknown>).username = overrides.username;
    }
    if (overrides.avatarUrl !== undefined) {
      (body as Record<string, unknown>).avatar_url = overrides.avatarUrl;
    }

    const route = `${Routes.webhookExecute(this.id, token)}${wait ? '?wait=true' : ''}`;
    const data = await this.client.rest.post<APIMessage | undefined>(route, {
      body,
      ...(files?.length ? { files } : {}),
      auth: false,
    });
    return wait && data ? new Message(this.client, data) : undefined;
  }

  /** Edit a message previously sent by this webhook. Requires token. */
  async editMessage(messageId: string, options: WebhookMessageEditOptions): Promise<Message> {
    const body: Record<string, unknown> = {};
    if (options.content !== undefined) body.content = options.content;
    if (options.embeds !== undefined) {
      body.embeds = options.embeds.map((e) => (e instanceof EmbedBuilder ? e.toJSON() : e));
    }
    if (options.attachments !== undefined) {
      body.attachments = toMessageAttachmentEditWire(options.attachments);
    }
    if (options.flags !== undefined) body.flags = options.flags;
    if (options.allowedMentions !== undefined) {
      body.allowed_mentions = toAPIAllowedMentions(options.allowedMentions);
    }

    const data = await this.client.rest.patch<APIMessage>(this.messageRoute(messageId), {
      body,
      auth: false,
    });
    return new Message(this.client, data);
  }

  /** Fetch a message sent by this webhook. Requires token. */
  async fetchMessage(messageId: string): Promise<Message> {
    const data = await this.client.rest.get<APIMessage>(this.messageRoute(messageId), {
      auth: false,
    });
    return new Message(this.client, data);
  }

  /** Delete a message sent by this webhook. Requires token. */
  async deleteMessage(messageId: string): Promise<void> {
    await this.client.rest.delete(this.messageRoute(messageId), { auth: false });
  }

  /** Fetch a webhook by ID (bot auth; no token). */
  static async fetch(client: Client, webhookId: string): Promise<Webhook> {
    const data = await client.rest.get(Routes.webhook(webhookId));
    return new Webhook(client, data as APIWebhook);
  }

  /** Build a webhook from a stored id + token (e.g. webhook URL). */
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
      type: WebhookType.Incoming,
      user: {
        id: '',
        username: 'webhook',
        discriminator: '0',
        global_name: null,
        avatar: null,
        avatar_color: null,
        flags: 0,
      },
    });
  }

  private requireToken(): string {
    if (!this.token) {
      throw new FluxerError(
        'Webhook token is required. It is only returned when creating a webhook.',
        { code: ErrorCodes.WebhookTokenRequired },
      );
    }
    return this.token;
  }

  private messageRoute(messageId: string): string {
    return Routes.webhookMessage(this.id, this.requireToken(), messageId);
  }
}
