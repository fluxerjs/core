import { Snowflake } from '../common/snowflake.js';

/**
 * Role from GET /guilds/{id}/roles
 * permissions is bitfield as string (e.g. "8933636165185")
 */
export interface APIRole {
  id: Snowflake;
  name: string;
  color: number;
  position: number;
  hoist_position?: number | null;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  unicode_emoji?: string | null;
}

/** Body for POST /guilds/{id}/roles (create role). All fields optional. */
export interface RESTCreateRoleBody {
  name?: string;
  permissions?: string;
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
  unicode_emoji?: string | null;
  position?: number;
  hoist_position?: number | null;
}

/** Body for PATCH /guilds/{id}/roles/{roleId} (update role). All fields optional. */
export interface RESTUpdateRoleBody {
  name?: string;
  permissions?: string;
  color?: number;
  hoist?: boolean;
  mentionable?: boolean;
  unicode_emoji?: string | null;
  position?: number;
  hoist_position?: number | null;
}
