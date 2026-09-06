/** Message bulk-fetch SDK options. */

import type { APIChannel, APIMessage, APIMessageSearchResponse } from '@fluxerjs/types';

/** A single channel's request within a bulk message fetch. */
export interface BulkFetchMessagesRequest {
  channelId: string;
  limit: number;
  before?: string;
  after?: string;
  around?: string;
}

/** Convert bulk-fetch requests to wire items. */
export function toBulkFetchWire(requests: readonly BulkFetchMessagesRequest[]): Array<{
  channel_id: string;
  limit: number;
  before?: string;
  after?: string;
  around?: string;
}> {
  return requests.map((r) => ({
    channel_id: r.channelId,
    limit: r.limit,
    ...(r.before !== undefined ? { before: r.before } : {}),
    ...(r.after !== undefined ? { after: r.after } : {}),
    ...(r.around !== undefined ? { around: r.around } : {}),
  }));
}

/**
 * CamelCase options for {@link Client.searchMessages}.
 * The helper always sends `scope: 'current'` (the only bot-legal scope).
 */
export interface MessageSearchOptions {
  content?: string;
  contents?: string[];
  exactPhrases?: string[];
  channelIds?: string[];
  excludeChannelIds?: string[];
  contextGuildId?: string;
  contextChannelId?: string;
  hitsPerPage?: number;
  page?: number;
  cursor?: string[];
  minId?: string;
  maxId?: string;
  authorIds?: string[];
  excludeAuthorIds?: string[];
  authorType?: Array<'user' | 'bot' | 'webhook'>;
  excludeAuthorType?: Array<'user' | 'bot' | 'webhook'>;
  mentions?: string[];
  excludeMentions?: string[];
  mentionEveryone?: boolean;
  pinned?: boolean;
  includeNsfw?: boolean;
  has?: string[];
  excludeHas?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Convert {@link MessageSearchOptions} to GlobalSearchMessagesRequest with `scope: current`. */
export function toMessageSearchBody(options: MessageSearchOptions = {}): Record<string, unknown> {
  const body: Record<string, unknown> = { scope: 'current' };
  if (options.content !== undefined) body.content = options.content;
  if (options.contents !== undefined) body.contents = options.contents;
  if (options.exactPhrases !== undefined) body.exact_phrases = options.exactPhrases;
  if (options.channelIds !== undefined) {
    body.channel_id = options.channelIds;
    body.channel_ids = options.channelIds;
  }
  if (options.excludeChannelIds !== undefined) body.exclude_channel_id = options.excludeChannelIds;
  if (options.contextGuildId !== undefined) body.context_guild_id = options.contextGuildId;
  if (options.contextChannelId !== undefined) body.context_channel_id = options.contextChannelId;
  if (options.hitsPerPage !== undefined) body.hits_per_page = options.hitsPerPage;
  if (options.page !== undefined) body.page = options.page;
  if (options.cursor !== undefined) body.cursor = options.cursor;
  if (options.minId !== undefined) body.min_id = options.minId;
  if (options.maxId !== undefined) body.max_id = options.maxId;
  if (options.authorIds !== undefined) body.author_id = options.authorIds;
  if (options.excludeAuthorIds !== undefined) body.exclude_author_id = options.excludeAuthorIds;
  if (options.authorType !== undefined) body.author_type = options.authorType;
  if (options.excludeAuthorType !== undefined) body.exclude_author_type = options.excludeAuthorType;
  if (options.mentions !== undefined) body.mentions = options.mentions;
  if (options.excludeMentions !== undefined) body.exclude_mentions = options.excludeMentions;
  if (options.mentionEveryone !== undefined) body.mention_everyone = options.mentionEveryone;
  if (options.pinned !== undefined) body.pinned = options.pinned;
  if (options.includeNsfw !== undefined) body.include_nsfw = options.includeNsfw;
  if (options.has !== undefined) body.has = options.has;
  if (options.excludeHas !== undefined) body.exclude_has = options.excludeHas;
  if (options.sortBy !== undefined) body.sort_by = options.sortBy;
  if (options.sortOrder !== undefined) body.sort_order = options.sortOrder;
  return body;
}

/** Search is still indexing one or more channels. */
export interface MessageSearchIndexing {
  indexing: true;
}

/** Successful camelCase search page from {@link Client.searchMessages}. */
export interface MessageSearchResults {
  messages: APIMessage[];
  channels: APIChannel[];
  total: number;
  hitsPerPage: number;
  page: number;
  cursor?: string[];
}

/** CamelCase response from {@link Client.searchMessages}. */
export type MessageSearchResponse = MessageSearchResults | MessageSearchIndexing;

/** True when search is still indexing. */
export function isMessageSearchIndexing(
  data: APIMessageSearchResponse | MessageSearchResponse,
): data is MessageSearchIndexing {
  return 'indexing' in data && data.indexing === true;
}

/** Map wire search response to camelCase. */
export function toMessageSearchResponse(data: APIMessageSearchResponse): MessageSearchResponse {
  if (isMessageSearchIndexing(data)) {
    return { indexing: true };
  }
  return {
    messages: data.messages,
    channels: data.channels,
    total: data.total,
    hitsPerPage: data.hits_per_page,
    page: data.page,
    ...(data.cursor !== undefined ? { cursor: data.cursor } : {}),
  };
}
