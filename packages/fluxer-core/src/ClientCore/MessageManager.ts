import { Collection } from '@fluxerjs/collection';
import type { APIMessage } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { Message } from '../Domain/Message/index.js';
import { rethrowMapped } from '../Helpers/HttpErrors.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import type { Client } from './Client.js';
import type { BulkFetchMessagesRequest } from './SdkOptions/index.js';

/** Options for GET /channels/{id}/messages. */
export interface FetchMessagesOptions {
  limit?: number;
  before?: string;
  after?: string;
  around?: string;
}

/** Options for {@link Client.bulkFetchMessages} (user-account only). */
export interface BulkFetchMessagesOptions {
  /** When true (default), hydrate {@link Message}s and update the cache. */
  hydrate?: boolean;
}

/** One channel's slice of a bulk message fetch. */
export interface BulkFetchMessagesChannelResult {
  channelId: string;
  messages: Collection<string, Message>;
}

/** Result of {@link MessageManager.bulkFetch}: per-channel message collections. */
export interface BulkFetchMessagesResult {
  channels: BulkFetchMessagesChannelResult[];
}

const BULK = {
  requests: { min: 1, max: 25 },
  limit: { min: 1, max: 25 },
  totalMax: 250,
} as const;

/** Validates POST /channels/messages/bulk request entries client-side. */
export function validateBulkMessageFetchRequests(
  requests: readonly BulkFetchMessagesRequest[],
): void {
  const { requests: req, limit, totalMax } = BULK;
  if (requests.length < req.min || requests.length > req.max) {
    throw new FluxerError(`bulkFetchMessages requires between ${req.min} and ${req.max} requests`, {
      code: ErrorCodes.InvalidFetchLimit,
    });
  }
  let total = 0;
  for (const request of requests) {
    if (request.limit < limit.min || request.limit > limit.max) {
      throw new FluxerError(
        `limit must be between ${limit.min} and ${limit.max} for channel ${request.channelId}`,
        { code: ErrorCodes.InvalidFetchLimit },
      );
    }
    total += request.limit;
  }
  if (total > totalMax) {
    throw new FluxerError(`bulkFetchMessages total message limit must not exceed ${totalMax}`, {
      code: ErrorCodes.InvalidFetchLimit,
    });
  }
}

/**
 * Per-channel message cache + fetch. Access via `channel.messages`.
 *
 * `get` returns the same {@link Message} instance for a cached id (identity).
 * `fetch` always writes through the client message cache (when enabled).
 */
export class MessageManager {
  /** Structure cache keyed by message id (identity for {@link get}). */
  private readonly _structures = new Collection<string, Message>();

  constructor(
    private readonly client: Client,
    private readonly channelId: string,
  ) {}

  /** Retrieve a cached message by ID, or `undefined` if missing / caching disabled. */
  get(messageId: string): Message | undefined {
    const data = this.client._getMessageCache(this.channelId)?.get(messageId);
    if (!data) {
      this._structures.delete(messageId);
      return undefined;
    }
    const existing = this._structures.get(messageId);
    if (existing) return existing;
    const message = new Message(this.client, data);
    this._structures.set(messageId, message);
    return message;
  }

  /** Retrieve from cache, otherwise {@link fetch}. */
  async resolve(messageId: string): Promise<Message> {
    return this.get(messageId) ?? this.fetch(messageId);
  }

  /** Fetch a single message by ID. */
  async fetch(messageId: string): Promise<Message>;
  /** Fetch multiple messages with query options (limit, before, after, around). */
  async fetch(options: FetchMessagesOptions): Promise<Collection<string, Message>>;
  async fetch(
    idOrOptions: string | FetchMessagesOptions,
  ): Promise<Message | Collection<string, Message>> {
    return typeof idOrOptions === 'string'
      ? this.fetchOne(idOrOptions)
      : this.fetchMany(idOrOptions);
  }

  /** Cache API data and return a {@link Message} (reusing identity when present). */
  private wrap(data: APIMessage): Message {
    this.client._addMessageToCache(this.channelId, data);
    const cached = this.client._getMessageCache(this.channelId)?.get(data.id) ?? data;
    const existing = this._structures.get(data.id);
    if (existing) {
      existing._patch(cached);
      return existing;
    }
    const message = new Message(this.client, cached);
    this._structures.set(data.id, message);
    return message;
  }

  /** Fetch a single message from the API. */
  private async fetchOne(messageId: string): Promise<Message> {
    try {
      const data = await this.client.rest.get<APIMessage>(
        Routes.channelMessage(this.channelId, messageId),
      );
      return this.wrap(data);
    } catch (err) {
      rethrowMapped(err, {
        notFound: {
          code: ErrorCodes.MessageNotFound,
          message: `Message ${messageId} not found in channel ${this.channelId}`,
        },
        fallback: `Failed to fetch message ${messageId}`,
      });
    }
  }

  /** Fetch multiple messages from the API with pagination/filtering. */
  private async fetchMany(options: FetchMessagesOptions): Promise<Collection<string, Message>> {
    if (options.limit != null && (options.limit < 1 || options.limit > 100)) {
      throw new FluxerError('limit must be between 1 and 100', {
        code: ErrorCodes.InvalidFetchLimit,
      });
    }

    const qs = new URLSearchParams();
    for (const key of ['limit', 'before', 'after', 'around'] as const) {
      const value = options[key];
      if (value != null && value !== '') qs.set(key, String(value));
    }
    const base = Routes.channelMessages(this.channelId);
    const data = await this.client.rest.get<APIMessage[]>(qs.size > 0 ? `${base}?${qs}` : base);

    const collection = new Collection<string, Message>();
    for (const msg of data) collection.set(msg.id, this.wrap(msg));
    return collection;
  }
}
