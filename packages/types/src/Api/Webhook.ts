import type { Snowflake } from '../Common/Snowflake.js';
import type { APIEmbed } from './Embed.js';
import type { APIUser } from './User.js';

/**
 * Webhook type (OpenAPI WebhookType).
 * - `Incoming` — standard webhook created by user/bot
 * - `ChannelFollower` — webhook created by following an announcement channel
 */
export enum WebhookType {
  Incoming = 1,
  ChannelFollower = 2,
}

/**
 * Webhook from GET /channels/{id}/webhooks (includes token) or GET /webhooks/{id} (no token).
 */
export interface APIWebhook {
  /** Webhook ID. */
  id: Snowflake;
  /** Guild containing the webhook. */
  guild_id: Snowflake;
  /** Channel the webhook posts to. */
  channel_id: Snowflake;
  /** Webhook display name. */
  name: string;
  /** Webhook avatar hash. */
  avatar?: string | null;
  /** Webhook token (present when listing channel webhooks). */
  token: string;
  /** User who created the webhook. */
  user: APIUser;
  /** Webhook type (incoming or channel follower). */
  type: WebhookType;
  /** Guild of a followed announcement channel, on channel-follower webhooks. */
  source_guild?: {
    /** Guild ID. */
    id: Snowflake;
    /** Guild name. */
    name: string;
    /** Guild icon hash. */
    icon: string | null;
  };
  /** Followed announcement channel, on channel-follower webhooks. */
  source_channel?: {
    /** Channel ID. */
    id: Snowflake;
    /** Channel name. */
    name: string;
  };
}

/** Request body for PATCH /webhooks/{id} (bot auth). All fields optional. */
export interface APIWebhookUpdateRequest {
  /** New webhook name. */
  name?: string;
  /** New webhook avatar (base64 or null to remove). */
  avatar?: string | null;
  /** Move webhook to a different channel. */
  channel_id?: Snowflake;
}

/** Request body for PATCH /webhooks/{id}/{token} (token auth). All fields optional. */
export interface APIWebhookTokenUpdateRequest {
  /** New webhook name. */
  name?: string;
  /** New webhook avatar (base64 or null to remove). */
  avatar?: string | null;
}

/** Request body for PATCH /webhooks/{id}/{token}/messages/{message_id}. All fields optional. */
export interface APIWebhookEditMessageRequest {
  /** New message content. */
  content?: string;
  /** New embeds. */
  embeds?: APIEmbed[];
  /** Attachment updates. */
  attachments?: unknown[];
}
