import type { Snowflake } from '../Common/Snowflake.js';
import type { APIChannelPartial } from './Channel.js';
import type { APIUser } from './User.js';

/**
 * Invite type discriminator (OpenAPI InviteTypes).
 * Fluxer only has guild and group-DM invites.
 */
export enum InviteType {
  Guild = 0,
  GroupDM = 1,
}

/** Partial guild embedded on guild invites. */
export interface APIGuildPartial {
  /** Guild ID. */
  id: Snowflake;
  /** Guild name. */
  name: string;
  /** Guild icon hash. */
  icon?: string | null;
  /** Guild banner hash. */
  banner?: string | null;
  /** Invite splash hash. */
  splash?: string | null;
  /** Guild features. */
  features?: string[];
}

/** Request body for POST /channels/{id}/invites (ChannelInviteCreateRequest). */
export interface ChannelInviteCreateRequest {
  /** Maximum number of uses (null = unlimited). */
  max_uses?: number | null;
  /** Expiration in seconds (null = never). */
  max_age?: number | null;
  /** Whether to create a unique code (no reuse). */
  unique?: boolean | null;
  /** Whether membership is temporary (kicked on disconnect). */
  temporary?: boolean | null;
}

/** Shared fields on all invite types. */
interface InviteShared {
  /** Invite code (the part after `/invite/`). */
  code: string;
  /** User who created the invite. */
  inviter?: APIUser | null;
  /** ISO-8601 expiration timestamp. */
  expires_at?: string | null;
  /** Whether membership is temporary (kicked on disconnect). Always present on REST responses; may be absent on gateway partials. */
  temporary?: boolean;
  /** ISO-8601 creation timestamp. */
  created_at?: string;
  /** Current use count. */
  uses?: number;
  /** Maximum use count (null = unlimited). */
  max_uses?: number;
  /** Maximum age in seconds (null = never). */
  max_age?: number;
}

/** Guild invite (type 0). */
export interface APIGuildInvite extends InviteShared {
  type: InviteType.Guild;
  /** Guild being invited to. */
  guild: APIGuildPartial;
  /** Channel the invite targets. */
  channel: APIChannelPartial;
  /**
   * Total guild member count.
   * Required on REST `GuildInviteResponse`; may be omitted on gateway INVITE_CREATE partials.
   */
  member_count?: number;
  /**
   * Online member count.
   * Required on REST `GuildInviteResponse`; may be omitted on gateway INVITE_CREATE partials.
   */
  presence_count?: number;
}

/** Group DM invite (type 1). */
export interface APIGroupDmInvite extends InviteShared {
  type: InviteType.GroupDM;
  /** Group DM channel. */
  channel: APIChannelPartial;
  /** Total member count. */
  member_count?: number;
}

/** Union of all invite types (GET /invites/{code}). */
export type APIInviteResponse = APIGuildInvite | APIGroupDmInvite;

/** Guild invite with full metadata (list/metadata responses). */
export type APIGuildInviteMetadata = APIGuildInvite &
  Required<Pick<InviteShared, 'created_at' | 'uses' | 'max_uses' | 'max_age' | 'temporary'>> &
  Required<Pick<APIGuildInvite, 'member_count' | 'presence_count'>>;

/** Group DM invite with full metadata (list/metadata responses). */
export type APIGroupDmInviteMetadata = APIGroupDmInvite &
  Required<Pick<InviteShared, 'created_at' | 'uses' | 'max_uses' | 'max_age' | 'temporary'>> &
  Required<Pick<APIGroupDmInvite, 'member_count'>>;

/** Union of all invite metadata types. */
export type APIInviteMetadata = APIGuildInviteMetadata | APIGroupDmInviteMetadata;

/** Any invite payload (REST, list, or gateway INVITE_CREATE). */
export type APIInvite = APIInviteResponse;

/** Type guard to check if invite is a guild invite. */
export function isGuildInvite(invite: APIInvite): invite is APIGuildInvite {
  return invite.type === InviteType.Guild;
}

/** Type guard to check if invite is a group DM invite. */
export function isGroupDmInvite(invite: APIInvite): invite is APIGroupDmInvite {
  return invite.type === InviteType.GroupDM;
}
