import { Snowflake } from '../common/snowflake.js';

/**
 * Partial user object returned by the API (messages, members, webhooks, etc.).
 * @see GET /users/{id} - Returns id, username, discriminator, global_name, avatar, avatar_color, flags
 * @see GET /users/@me - Returns full user with bot, email, premium fields, etc.
 */
export interface APIUserPartial {
  id: Snowflake;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
  /** RGB color as number (e.g. 7577782) */
  avatar_color?: number | null;
  /** Public/user flags bitfield */
  flags?: number | null;
  /** @deprecated Use flags. Discord compat. */
  public_flags?: number | null;
  /** Present when author is a bot */
  bot?: boolean;
  /** Whether this is an official system user */
  system?: boolean;
  /** User banner hash (from profile, member, or invite context) */
  banner?: string | null;
}

export type APIUser = APIUserPartial;

/**
 * User profile sub-object from GET /users/{id}/profile.
 * @see https://docs.fluxer.app/api-reference
 */
export interface APIUserProfile {
  pronouns?: string | null;
  bio?: string | null;
  banner?: string | null;
  accent_color?: number | null;
  banner_color?: number | null;
  theme?: string | null;
}

/**
 * Connected account from profile response.
 */
export interface APIConnectedAccount {
  name?: string | null;
  type?: string | null;
}

/**
 * Full profile response from GET /users/{id}/profile.
 * Optionally use ?guild_id=GUILD_ID for server-specific profile.
 */
export interface APIProfileResponse {
  user_profile?: APIUserProfile | null;
  mutual_guilds?: Array<{ id: Snowflake }> | null;
  mutual_guild_ids?: Snowflake[] | null;
  connected_accounts?: APIConnectedAccount[] | null;
}

/**
 * Guild member from GET /guilds/{guild_id}/members or GET /guilds/{guild_id}/members/{user_id}
 */
export interface APIGuildMember {
  user: APIUserPartial;
  nick?: string | null;
  avatar?: string | null;
  banner?: string | null;
  accent_color?: number | null;
  roles: Snowflake[];
  joined_at: string;
  mute?: boolean;
  deaf?: boolean;
  communication_disabled_until?: string | null;
  profile_flags?: number | null;
  /** When the user started boosting this guild. */
  premium_since?: string | null;
}
