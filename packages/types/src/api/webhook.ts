import type { Snowflake } from '../common/snowflake.js';
import type { APIUser } from './user.js';

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
