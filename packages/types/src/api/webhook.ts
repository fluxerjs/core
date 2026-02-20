import { Snowflake } from '../common/snowflake.js';
import { APIUser } from './user.js';

export enum WebhookType {
  Incoming = 1,
  ChannelFollower = 2,
}

/**
 * Webhook from GET /channels/{id}/webhooks (includes token) or GET /webhooks/{id} (no token)
 */
export interface APIWebhook {
  id: Snowflake;
  guild_id: Snowflake;
  channel_id: Snowflake;
  name: string;
  avatar: string | null;
  /** Present when listing channel webhooks; not returned when fetching by ID without token */
  token?: string;
  user: APIUser;
}

/** Request body for PATCH /webhooks/{id} (bot auth). All fields optional. */
export interface APIWebhookUpdateRequest {
  name?: string;
  avatar?: string | null;
  channel_id?: Snowflake;
}

/** Request body for PATCH /webhooks/{id}/{token} (token auth). All fields optional. */
export interface APIWebhookTokenUpdateRequest {
  name?: string;
  avatar?: string | null;
}
