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
    options?: Array<{ name: string; type: number; value?: unknown }>;
  };
  guild_id?: string;
  channel_id?: string;
  member?: unknown;
  user?: unknown;
}
