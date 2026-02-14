import type { Snowflake } from '../common/snowflake.js';
import type { APIUser } from './user.js';

export interface APIEmoji {
  id: Snowflake;
  name: string;
  animated: boolean;
}

export interface APIEmojiWithUser extends APIEmoji {
  user?: APIUser;
}
