import { Snowflake } from '../common/snowflake.js';
import { APIUser } from './user.js';
import { APIChannelPartial } from './channel.js';

export interface APIGuildPartial {
  id: Snowflake;
  name: string;
  icon?: string | null;
  banner?: string | null;
  splash?: string | null;
  features?: string[];
}

export interface APIInvite {
  code: string;
  type: number;
  guild: APIGuildPartial;
  channel: APIChannelPartial;
  inviter?: APIUser | null;
  member_count?: number;
  presence_count?: number;
  expires_at?: string | null;
  temporary?: boolean;
  created_at?: string;
  uses?: number;
  max_uses?: number;
  max_age?: number;
}
