import { APIUser } from './user.js';
import { APIGuildMember } from './user.js';
import { Snowflake } from '../common/snowflake.js';

/** Application command option value (string, number, or boolean). */
export type APIApplicationCommandOptionValue = string | number | boolean;

/** Minimal application command interaction (slash command) payload from the gateway. */
export interface APIApplicationCommandInteraction {
  id: string;
  application_id: string;
  type: number;
  token: string;
  data?: {
    id?: string;
    name: string;
    type?: number;
    options?: Array<{ name: string; type: number; value?: APIApplicationCommandOptionValue }>;
  };
  guild_id?: string;
  channel_id?: string;
  /** Guild member (when interaction is in a guild). Includes user. */
  member?: APIGuildMember & { guild_id?: Snowflake };
  /** User who ran the command (DM context or fallback). */
  user?: APIUser;
}
