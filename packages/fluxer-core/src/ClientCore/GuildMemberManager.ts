import { LimitedCollection } from '@fluxerjs/collection';
import { type APIGuildMember, type APIGuildMemberSearchResponse, Routes } from '@fluxerjs/types';
import type { Guild } from '../Domain/Guild/Guild.js';
import { GuildMember } from '../Domain/Guild/GuildMember.js';
import type { GuildMemberSearchPayload } from './EventPayloads.js';
import { type GuildMemberSearchOptions, toMemberSearchBody } from './SdkOptions/index.js';

/** Options for single-member {@link GuildMemberManager.fetch}. */
export interface FetchGuildMemberOptions {
  /** When true, always hit REST even if the member is cached. */
  force?: boolean;
}

/** Options for list {@link GuildMemberManager.fetch}. */
export interface FetchGuildMembersOptions {
  /** Max members to return (1-1000). */
  limit?: number;
  /** User ID cursor for pagination. */
  after?: string;
}

/**
 * Manages guild members with a Collection-like API.
 * Extends LimitedCollection so you can use .get(), .set(), .filter(), etc.
 */
export class GuildMemberManager extends LimitedCollection<string, GuildMember> {
  constructor(private readonly guild: Guild) {
    super({ maxSize: guild.client.cache.limits.members });
  }

  /**
   * Get a guild member from cache or fetch from the API if not present.
   * Convenience helper to avoid repeating `guild.members.get(userId) ?? (await guild.fetchMember(userId))`.
   * @param userId - Snowflake of the user
   * @returns The guild member
   * @throws FluxerError with MEMBER_NOT_FOUND if user is not in the guild (404)
   * @example
   * const member = await guild.members.resolve(userId);
   * console.log(member.displayName);
   */
  async resolve(userId: string): Promise<GuildMember> {
    return this.get(userId) ?? this.fetch(userId);
  }

  /**
   * The current bot user as a GuildMember in this guild.
   * Returns null if the bot's member is not cached or client.user is null.
   * Use fetchMe() to load the bot's member when not cached.
   *
   * @example
   * const perms = guild.members.me?.permissions;
   * if (perms?.has(PermissionFlags.BanMembers)) { ... }
   */
  get me(): GuildMember | null {
    const userId = this.guild.client.user?.id;
    return userId ? (this.get(userId) ?? null) : null;
  }

  /**
   * Fetch the current bot user as a GuildMember in this guild.
   * Caches the result in guild.members.
   *
   * @throws FluxerError with CLIENT_NOT_READY if client.user is null
   * @example
   * const me = await guild.members.fetchMe();
   * console.log(me.displayName);
   */
  async fetchMe(): Promise<GuildMember> {
    return this.guild.fetchMe();
  }

  /**
   * Fetch a single guild member by user ID.
   * Returns the cached member unless `force` is set.
   * @throws FluxerError with MEMBER_NOT_FOUND if missing
   */
  async fetch(userId: string, options?: FetchGuildMemberOptions): Promise<GuildMember>;
  /**
   * Fetch guild members with pagination. GET /guilds/{id}/members.
   * @param options - limit (1-1000), after (user ID for pagination)
   * @returns Array of GuildMember objects (cached in guild.members)
   */
  async fetch(options?: FetchGuildMembersOptions): Promise<GuildMember[]>;
  async fetch(
    userIdOrOptions?: string | FetchGuildMembersOptions,
    options?: FetchGuildMemberOptions,
  ): Promise<GuildMember | GuildMember[]> {
    if (typeof userIdOrOptions === 'string') {
      const cached = this.get(userIdOrOptions);
      if (cached && !options?.force) return cached;
      return this.guild.fetchMember(userIdOrOptions);
    }
    return this.fetchMany(userIdOrOptions);
  }

  private async fetchMany(options?: FetchGuildMembersOptions): Promise<GuildMember[]> {
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.after) params.set('after', options.after);
    const qs = params.toString();
    const url = Routes.guildMembers(this.guild.id) + (qs ? `?${qs}` : '');
    const data = await this.guild.client.rest.get<APIGuildMember[]>(url, { auth: true });
    const members: GuildMember[] = [];
    for (const m of data) {
      const member = new GuildMember(
        this.guild.client,
        { ...m, guild_id: this.guild.id },
        this.guild,
      );
      this.set(member.id, member);
      members.push(member);
    }
    return members;
  }

  /**
   * Search guild members. POST /guilds/{id}/members-search.
   * @param options - CamelCase search query, filters, and pagination
   * @returns CamelCase search results; `member` is set from cache when present
   * @example
   * const { members } = await guild.members.search({ query: 'alex', limit: 25 });
   */
  async search(options: GuildMemberSearchOptions = {}): Promise<GuildMemberSearchPayload> {
    const data = await this.guild.client.rest.post<APIGuildMemberSearchResponse>(
      Routes.guildMembersSearch(this.guild.id),
      { body: toMemberSearchBody(options), auth: true },
    );
    const offset = options.offset ?? 0;
    const members = data.members.map((hit) => ({
      id: hit.id,
      guildId: hit.guild_id,
      userId: hit.user_id,
      username: hit.username,
      discriminator: hit.discriminator,
      globalName: hit.global_name,
      nickname: hit.nickname,
      member: this.get(hit.user_id) ?? null,
    }));
    return {
      guildId: data.guild_id,
      members,
      total: data.total_result_count,
      pageResultCount: data.page_result_count,
      hasMore: offset + members.length < data.total_result_count,
      indexing: data.indexing,
    };
  }
}
