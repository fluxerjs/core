import type { Snowflake } from '../common/snowflake.js';

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
