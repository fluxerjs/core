import type {
  APIChannel,
  APIMessage,
  APISearchIndexNotReady,
  APIThreadMember,
  APIThreadSearchResponse,
  APIThreadsListing,
} from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import type {
  FetchArchivedThreadsOptions,
  FetchJoinedArchivedThreadsOptions,
  StartForumThreadOptions,
  StartThreadOptions,
  ThreadParentEditOptions,
  ThreadSearchOptions,
} from '../../ClientCore/SdkOptions/index.js';
import {
  toForumThreadMessage,
  toStartThreadBody,
  toThreadParentEditBody,
  withQuery,
} from '../../ClientCore/SdkOptions/index.js';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import { prepareMessagePostPayload } from '../../Helpers/MessageUtils/index.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { FluxerError } from '../../LibErrors/FluxerError.js';
import { Message } from '../Message/index.js';
import type { ThreadParentChannel } from './ThreadBind.js';
import { cacheThread } from './ThreadCache.js';
import { type ThreadChannel, ThreadMember } from './ThreadChannel.js';

/** A page of threads plus the current user's membership in each joined thread. */
export interface FetchedThreads {
  threads: ThreadChannel[];
  members: ThreadMember[];
  /** Whether another page may exist. Active-thread listings are a single page. */
  hasMore: boolean;
}

/** Thread search hit list, or a not-ready index. */
export type ThreadSearchPage =
  | (FetchedThreads & { totalResults: number; firstMessages: Message[] })
  | { indexing: true; retryAfter: number; message: string };

/** Create, list, and search threads in one parent channel. */
export class ThreadManager {
  constructor(private readonly channel: ThreadParentChannel) {}

  /**
   * Start a thread in a text or announcement channel.
   * Forum and media channels must use {@link createPost}.
   */
  async create(options: StartThreadOptions): Promise<ThreadChannel> {
    if (
      this.channel.type === ChannelType.GuildForum ||
      this.channel.type === ChannelType.GuildMedia
    ) {
      throw new FluxerError('Forum and media channels start posts with createPost', {
        code: ErrorCodes.InvalidChannelType,
      });
    }
    const data = await this.channel.client.rest.post<APIChannel>(
      Routes.channelThreads(this.channel.id),
      {
        body: toStartThreadBody(this.channel.type, options),
        auth: true,
        ...auditReasonHeaders(options.reason),
      },
    );
    return cacheThread(this.channel.client, data);
  }

  /**
   * Start a post in a forum or media channel.
   * The post is a public thread. `message` is its first message.
   */
  async createPost(options: StartForumThreadOptions): Promise<ThreadChannel> {
    if (
      this.channel.type !== ChannelType.GuildForum &&
      this.channel.type !== ChannelType.GuildMedia
    ) {
      throw new FluxerError('createPost is for forum and media channels', {
        code: ErrorCodes.InvalidChannelType,
      });
    }
    const prepared = await prepareMessagePostPayload(options.message, {
      defaultAllowedMentions: this.channel.client.options.defaultAllowedMentions,
    });
    const body: Record<string, unknown> = {
      name: options.name,
      type: ChannelType.PublicThread,
      message: toForumThreadMessage(prepared.body),
    };
    if (options.autoArchiveDuration !== undefined) {
      body.auto_archive_duration = options.autoArchiveDuration;
    }
    if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;
    if (options.appliedTags !== undefined) body.applied_tags = options.appliedTags;
    const data = await this.channel.client.rest.post<APIChannel & { message?: APIMessage }>(
      Routes.channelThreads(this.channel.id),
      {
        body,
        files: prepared.files,
        auth: true,
        ...auditReasonHeaders(options.reason),
      },
    );
    const thread = cacheThread(this.channel.client, data);
    if (data.message) {
      this.channel.client._addMessageToCache(data.message.channel_id, data.message);
    }
    return thread;
  }

  /**
   * List archived threads in this channel.
   * `before` is an ISO-8601 archive timestamp.
   */
  async fetchArchived(options: FetchArchivedThreadsOptions): Promise<FetchedThreads> {
    const path =
      options.type === 'private'
        ? Routes.channelThreadsArchivedPrivate(this.channel.id)
        : Routes.channelThreadsArchivedPublic(this.channel.id);
    const data = await this.channel.client.rest.get<APIThreadsListing>(
      withQuery(path, { before: options.before, limit: options.limit }),
    );
    return fetchedThreadsFrom(this.channel.client, data);
  }

  /**
   * List private archived threads in this channel that the current user has joined.
   * `before` is a thread snowflake.
   */
  async fetchJoinedPrivateArchived(
    options?: FetchJoinedArchivedThreadsOptions,
  ): Promise<FetchedThreads> {
    const data = await this.channel.client.rest.get<APIThreadsListing>(
      withQuery(Routes.channelJoinedArchivedPrivateThreads(this.channel.id), {
        before: options?.before,
        limit: options?.limit,
      }),
    );
    return fetchedThreadsFrom(this.channel.client, data);
  }

  /**
   * Search threads in this channel.
   * Returns `{ indexing: true }` while the search index is still building.
   */
  async search(options?: ThreadSearchOptions): Promise<ThreadSearchPage> {
    const data = await this.channel.client.rest.get<
      APIThreadSearchResponse | APISearchIndexNotReady
    >(
      withQuery(Routes.channelThreadSearch(this.channel.id), {
        name: options?.name,
        tag: options?.tag,
        tag_setting: options?.tagSetting,
        archived: options?.archived === undefined ? undefined : String(options.archived),
        sort_by: options?.sortBy,
        sort_order: options?.sortOrder,
        limit: options?.limit,
        offset: options?.offset,
        max_id: options?.maxId,
        min_id: options?.minId,
      }),
    );
    if (isSearchNotReady(data)) {
      return { indexing: true, retryAfter: data.retry_after, message: data.message };
    }
    const page = fetchedThreadsFrom(this.channel.client, data);
    return {
      ...page,
      hasMore: data.has_more,
      totalResults: data.total_results,
      firstMessages: (data.first_messages ?? []).map(
        (message) => new Message(this.channel.client, message),
      ),
    };
  }

  /** Set the auto-archive and slowmode defaults copied onto new threads. */
  async editDefaults(options: ThreadParentEditOptions): Promise<APIChannel> {
    return this.channel.client.rest.patch<APIChannel>(Routes.channel(this.channel.id), {
      body: toThreadParentEditBody(options),
      auth: true,
      ...auditReasonHeaders(options.reason),
    });
  }
}

/** Cache a thread listing and return structure instances. */
export function fetchedThreadsFrom(client: Client, data: APIThreadsListing): FetchedThreads {
  return {
    threads: (data.threads ?? []).map((thread) => cacheThread(client, thread)),
    members: (data.members ?? []).map((member) => new ThreadMember(member)),
    hasMore: data.has_more ?? false,
  };
}

function isSearchNotReady(
  data: APIThreadSearchResponse | APISearchIndexNotReady,
): data is APISearchIndexNotReady {
  return 'code' in data && data.code === 'SEARCH_INDEX_NOT_READY';
}

/** Active threads in a guild (GET /guilds/{id}/threads/active). */
export async function fetchActiveThreads(client: Client, guildId: string): Promise<FetchedThreads> {
  const data = await client.rest.get<APIThreadsListing>(Routes.guildActiveThreads(guildId));
  return fetchedThreadsFrom(client, data);
}

export type { APIMessage, APIThreadMember };
