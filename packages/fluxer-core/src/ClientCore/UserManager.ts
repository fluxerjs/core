import { LimitedCollection } from '@fluxerjs/collection';
import {
  type APIGuildMember,
  type APIProfileResponse,
  type APIUserPartial,
  Routes,
} from '@fluxerjs/types';
import { cacheMember } from '../Domain/Guild/Cache.js';
import type { GuildMember } from '../Domain/Guild/GuildMember.js';
import type { User } from '../Domain/User.js';
import type { Client } from './Client.js';
import { type ProfilePayload, toProfilePayload } from './SdkOptions/index.js';

type MemberPayload = APIGuildMember & { user: { id: string } };

const soft = <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

/** Result of {@link UserManager.fetchWithProfile}. */
export interface FetchedUserWithProfile {
  user: User;
  userData: APIUserPartial;
  globalProfile: ProfilePayload | null;
  serverProfile: ProfilePayload | null;
  member: GuildMember | null;
  memberData: MemberPayload | null;
}

/**
 * User cache + fetch/profile helpers.
 * Extends LimitedCollection (`.get()`, `.set()`, `.filter()`, …).
 * Access via {@link Client.users}.
 */
export class UserManager extends LimitedCollection<string, User> {
  constructor(private readonly client: Client) {
    super({ maxSize: client.cache.limits.users });
  }

  /** Remove matching users (skips `client.user`). Returns count removed. */
  override sweep(filter?: (user: User, id: string) => boolean): number {
    let removed = 0;
    const selfId = this.client.user?.id;
    for (const [id, user] of this) {
      if (id === selfId) continue;
      if (!filter || filter(user, id)) {
        this.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /** Fetch a user by ID and update cache. Returns cache unless `force` is set. */
  async fetch(userId: string, options?: { force?: boolean }): Promise<User> {
    const cached = this.get(userId);
    if (cached && !options?.force) return cached;
    const data = await this.client.rest.get<APIUserPartial>(Routes.user(userId));
    return this.client.getOrCreateUser(data);
  }

  /** Return a cached user, otherwise {@link fetch}. */
  async resolve(userId: string): Promise<User> {
    return this.get(userId) ?? this.fetch(userId);
  }

  /**
   * Fetch user + profiles (+ optional guild member). Ideal for userinfo commands.
   * @example
   * const { user, globalProfile, member } = await client.users.fetchWithProfile(
   *   userId,
   *   { guildId: message.guildId ?? undefined },
   * );
   */
  async fetchWithProfile(
    userId: string,
    options?: { guildId?: string | null },
  ): Promise<FetchedUserWithProfile> {
    const guildId = options?.guildId ?? undefined;

    const [userData, globalProfileRaw, serverProfileRaw, memberData] = await Promise.all([
      this.client.rest.get<APIUserPartial>(Routes.user(userId)),
      soft<APIProfileResponse>(this.client.rest.get(Routes.userProfile(userId))),
      guildId
        ? soft<APIProfileResponse>(this.client.rest.get(Routes.userProfile(userId, guildId)))
        : null,
      guildId
        ? soft<MemberPayload>(this.client.rest.get(Routes.guildMember(guildId, userId)))
        : null,
    ]);

    const user = this.client.getOrCreateUser(userData);

    let member: GuildMember | null = null;
    if (memberData && guildId) {
      let guild = this.client.guilds.get(guildId);
      if (!guild) {
        try {
          guild = await this.client.guilds.fetch(guildId);
        } catch {
          guild = undefined;
        }
      }
      if (guild) {
        member = cacheMember(guild, memberData);
      }
    }

    return {
      user,
      userData,
      globalProfile: globalProfileRaw ? toProfilePayload(globalProfileRaw) : null,
      serverProfile: serverProfileRaw ? toProfilePayload(serverProfileRaw) : null,
      member,
      memberData,
    };
  }
}
