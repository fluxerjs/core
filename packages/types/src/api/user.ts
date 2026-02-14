import type { Snowflake } from '../common/snowflake.js';

export interface APIUserPartial {
  id: Snowflake;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
  avatar_color?: number | null;
  public_flags?: number | null;
}

export type APIUser = APIUserPartial;

export interface APIGuildMember {
  user: APIUserPartial;
  nick?: string | null;
  avatar?: string | null;
  banner?: string | null;
  accent_color?: number | null;
  roles: Snowflake[];
  joined_at: string;
  mute: boolean;
  deaf: boolean;
  communication_disabled_until?: string | null;
  profile_flags?: number | null;
}
