import type { Channel } from './Channel.js';

/** Minimal message data for MessageDelete when the full message is not available. */
export interface PartialMessage {
  id: string;
  channelId: string;
  channel?: Channel | null;
}
