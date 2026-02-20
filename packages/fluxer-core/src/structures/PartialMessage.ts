import { Channel } from './Channel.js';

/** Minimal message data for MessageDelete when the full message is not available. */
export interface PartialMessage {
  id: string;
  channelId: string;
  channel?: Channel | null;
  /** Message content, when provided by the gateway (e.g. Fluxer). */
  content?: string | null;
  /** Author user ID, when provided by the gateway (e.g. Fluxer). */
  authorId?: string | null;
}
