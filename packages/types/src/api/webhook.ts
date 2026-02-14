import type { Snowflake } from '../common/snowflake.js';
import type { APIUser } from './user.js';

export enum WebhookType {
  Incoming = 1,
  ChannelFollower = 2,
}

export interface APIWebhook {
  id: Snowflake;
  guild_id: Snowflake;
  channel_id: Snowflake;
  name: string;
  avatar: string | null;
  token: string;
  user: APIUser;
}
