import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import type { APIUserPartial, APIProfileResponse, APIGuildMember } from '@fluxerjs/types';
import type { Client } from './Client.js';
import { User } from '../structures/User.js';
import { GuildMember } from '../structures/GuildMember.js';

/** Result of {@link UsersManager.fetchWithProfile}. */
export interface FetchedUserWithProfile {
  /** The user (cached in client.users). */
  user: User;
  /** Raw user data from GET /users/{id}. */
  userData: APIUserPartial;
  /** Global profile (bio, pronouns, mutual guilds, etc.). Null if unavailable. */
  globalProfile: APIProfileResponse | null;
  /** Server-specific profile when guildId was provided. Null if unavailable. */
  serverProfile: APIProfileResponse | null;
  /** Guild member when guildId was provided and user is in the guild. Null otherwise. */
  member: GuildMember | null;
  /** Raw member data when member exists (for premium_since, etc.). */
  memberData: (APIGuildMember & { user: { id: string } }) | null;
}

/**
 * Manages users with fetch and profile helpers.
 * Extends Collection so you can use .get(), .set(), .filter(), etc.
 */
export class UsersManager extends Collection<string, User> {
  private readonly maxSize: number;

  constructor(private readonly client: Client) {
    super();
    this.maxSize = client.options?.cache?.users ?? 0;
  }

  override set(key: string, value: User): this {
    if (this.maxSize > 0 && this.size >= this.maxSize && !this.has(key)) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) this.delete(firstKey);
    }
    return super.set(key, value);
  }

  /**
   * Fetch a user by ID from the API.
   * Updates cache if user already exists.
   * @param userId - Snowflake of the user
   * @returns The user
   * @throws FluxerError (or REST error) if user not found
   * @example
   * const user = await client.users.fetch(userId);
   * console.log(user.username);
   */
  async fetch(userId: string): Promise<User> {
    const data = await this.client.rest.get<APIUserPartial>(Routes.user(userId));
    return this.client.getOrCreateUser(data);
  }

  /**
   * Fetch a user with full profile and optional guild context.
   * Returns user, global profile, server profile (when guildId), and member (when guildId).
   * Ideal for userinfo commands.
   * @param userId - Snowflake of the user
   * @param options - Optional guildId for server profile and member data
   * @returns User, raw data, profiles, and member (when in guild)
   * @throws FluxerError (or REST error) if user not found
   * @example
   * const { user, globalProfile, serverProfile, member } = await client.users.fetchWithProfile(
   *   userId,
   *   { guildId: message.guildId ?? undefined },
   * );
   */
  async fetchWithProfile(
    userId: string,
    options?: { guildId?: string | null },
  ): Promise<FetchedUserWithProfile> {
    const guildId = options?.guildId ?? undefined;

    const [userData, globalProfileData, serverProfileData, memberData] = await Promise.all([
      this.client.rest.get<APIUserPartial>(Routes.user(userId)),
      this.client.rest.get(Routes.userProfile(userId)).catch((): APIProfileResponse | null => null),
      guildId
        ? this.client.rest
            .get(Routes.userProfile(userId, guildId))
            .catch((): APIProfileResponse | null => null)
        : Promise.resolve(null),
      guildId
        ? this.client.rest
            .get<APIGuildMember & { user: { id: string } }>(Routes.guildMember(guildId, userId))
            .catch((): null => null)
        : Promise.resolve(null),
    ]);

    const user = this.client.getOrCreateUser(userData);
    const globalProfile =
      globalProfileData && typeof globalProfileData === 'object'
        ? (globalProfileData as APIProfileResponse)
        : null;
    const serverProfile =
      serverProfileData && typeof serverProfileData === 'object'
        ? (serverProfileData as APIProfileResponse)
        : null;

    let member: GuildMember | null = null;
    if (memberData && guildId) {
      const guild = this.client.guilds.get(guildId) ?? (await this.client.guilds.fetch(guildId));
      if (guild) {
        member = new GuildMember(this.client, { ...memberData, guild_id: guildId }, guild);
        guild.members.set(member.id, member);
      }
    }

    return {
      user,
      userData,
      globalProfile,
      serverProfile,
      member,
      memberData: memberData as (APIGuildMember & { user: { id: string } }) | null,
    };
  }
}
