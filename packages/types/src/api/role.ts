import type { Snowflake } from '../common/snowflake.js';

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
