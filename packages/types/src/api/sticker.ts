import { Snowflake } from '../common/snowflake.js';
import { APIUser } from './user.js';

export interface APISticker {
  id: Snowflake;
  name: string;
  description: string;
  tags: string[];
  animated: boolean;
}

export interface APIStickerWithUser extends APISticker {
  user?: APIUser;
}
