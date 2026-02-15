import { parseRoleMention } from '@fluxerjs/util';
import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { Collection } from '@fluxerjs/collection';
import type { APIGuild, APIGuildMember, APIRole } from '@fluxerjs/types';
import { GuildMember } from './GuildMember.js';
import { Role } from './Role.js';
import type { GuildChannel } from './Channel.js';
import { CDN_URL } from '../util/Constants.js';
import { Routes } from '@fluxerjs/types';
import type { Webhook } from './Webhook.js';

/** Represents a Fluxer guild (server). */
export class Guild extends Base {
  readonly client: Client;
  readonly id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  readonly ownerId: string;
  members = new Collection<string, GuildMember>();
  channels = new Collection<string, GuildChannel>();
  roles = new Collection<string, Role>();

  /** @param data - API guild from GET /guilds/{id} or gateway GUILD_CREATE */
  constructor(client: Client, data: APIGuild & { roles?: APIRole[] }) {
    super();
    this.client = client;
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon ?? null;
    this.banner = data.banner ?? null;
    this.ownerId = data.owner_id;
    for (const r of data.roles ?? []) {
      this.roles.set(r.id, new Role(client, r, this.id));
    }
  }

  /** Get the guild icon URL, or null if no icon. */
  iconURL(options?: { size?: number }): string | null {
    if (!this.icon) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/icons/${this.id}/${this.icon}.png${size}`;
  }

  /** Get the guild banner URL, or null if no banner. */
  bannerURL(options?: { size?: number }): string | null {
    if (!this.banner) return null;
    const size = options?.size ? `?size=${options.size}` : '';
    return `${CDN_URL}/banners/${this.id}/${this.banner}.png${size}`;
  }

  /**
   * Add a role to a member by user ID. Does not require fetching the member first.
   * @param userId - The user ID of the member
   * @param roleId - The role ID to add (or use guild.resolveRoleId for mention/name resolution)
   * Requires Manage Roles permission.
   */
  async addRoleToMember(userId: string, roleId: string): Promise<void> {
    await this.client.rest.put(Routes.guildMemberRole(this.id, userId, roleId));
  }

  /**
   * Remove a role from a member by user ID. Does not require fetching the member first.
   * @param userId - The user ID of the member
   * @param roleId - The role ID to remove
   * Requires Manage Roles permission.
   */
  async removeRoleFromMember(userId: string, roleId: string): Promise<void> {
    await this.client.rest.delete(Routes.guildMemberRole(this.id, userId, roleId));
  }

  /**
   * Resolve a role ID from an argument (role mention, raw ID, or name).
   * Fetches guild roles if name is provided.
   * @param arg - Role mention (@role), role ID, or role name
   * @returns The role ID, or null if not found
   */
  async resolveRoleId(arg: string): Promise<string | null> {
    const parsed = parseRoleMention(arg);
    if (parsed) return parsed;
    if (/^\d{17,19}$/.test(arg.trim())) return arg.trim();
    const cached = this.roles.find(
      (r) => !!(r.name && r.name.toLowerCase() === arg.trim().toLowerCase())
    );
    if (cached) return cached.id;
    const roles = await this.client.rest.get(Routes.guildRoles(this.id));
    const list = (Array.isArray(roles) ? roles : Object.values(roles ?? {})) as Array<APIRole>;
    const role = list.find(
      (r) => !!(r.name && r.name.toLowerCase() === arg.trim().toLowerCase())
    );
    if (role) {
      this.roles.set(role.id, new Role(this.client, role, this.id));
      return role.id;
    }
    return null;
  }

  /**
   * Fetch a guild member by user ID.
   * @param userId - The user ID of the member to fetch
   * @returns The guild member, or null if not found
   */
  async fetchMember(userId: string): Promise<GuildMember | null> {
    try {
      const data = await this.client.rest.get<APIGuildMember & { user: { id: string } }>(
        Routes.guildMember(this.id, userId)
      );
      return new GuildMember(this.client, { ...data, guild_id: this.id }, this);
    } catch {
      return null;
    }
  }

  /** Fetch all webhooks in this guild. Returned webhooks do not include the token (cannot send). */
  async fetchWebhooks(): Promise<Webhook[]> {
    const { Webhook } = await import('./Webhook.js');
    const data = await this.client.rest.get(Routes.guildWebhooks(this.id));
    const list = Array.isArray(data) ? data : Object.values(data ?? {});
    return list.map((w) => new Webhook(this.client, w));
  }
}
