import type { Snowflake } from '../Common/Snowflake.js';
import type { APIChannel } from './Channel.js';
import type { APIMessage } from './Message.js';

/**
 * Bot-legal search scope for POST /search/messages.
 * Fluxer rejects other scopes for bots (`BOT_SEARCH_SCOPE_UNAVAILABLE`).
 */
export type MessageSearchScope = 'current';

/** Request body for POST /search/messages (GlobalSearchMessagesRequest). */
export interface APIMessageSearchRequest {
  /** Always `current` for bot tokens. */
  scope?: MessageSearchScope;
  content?: string;
  contents?: string[];
  exact_phrases?: string[];
  channel_id?: Snowflake[];
  channel_ids?: Snowflake[];
  exclude_channel_id?: Snowflake[];
  context_guild_id?: Snowflake;
  context_channel_id?: Snowflake;
  hits_per_page?: number;
  page?: number;
  cursor?: string[];
  max_id?: Snowflake;
  min_id?: Snowflake;
  author_id?: Snowflake[];
  exclude_author_id?: Snowflake[];
  author_type?: Array<'user' | 'bot' | 'webhook'>;
  exclude_author_type?: Array<'user' | 'bot' | 'webhook'>;
  mentions?: Snowflake[];
  exclude_mentions?: Snowflake[];
  mention_everyone?: boolean;
  pinned?: boolean;
  include_nsfw?: boolean;
  has?: string[];
  exclude_has?: string[];
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** Successful search page from POST /search/messages. */
export interface APIMessageSearchResults {
  messages: APIMessage[];
  channels: APIChannel[];
  total: number;
  hits_per_page: number;
  page: number;
  cursor?: string[];
}

/** Search is still indexing one or more channels. */
export interface APIMessageSearchIndexing {
  indexing: true;
}

/** Response from POST /search/messages. */
export type APIMessageSearchResponse = APIMessageSearchResults | APIMessageSearchIndexing;
