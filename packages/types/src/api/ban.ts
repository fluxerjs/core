import { APIUser } from './user.js';

export interface APIBan {
  user: APIUser;
  reason: string | null;
  /** ISO timestamp when a temporary ban expires. Null for permanent bans. */
  expires_at?: string | null;
}
