import type { APIUser } from './user.js';

export interface APIBan {
  user: APIUser;
  reason: string | null;
}
