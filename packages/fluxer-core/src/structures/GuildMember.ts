import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { User } from './User.js';
import type { Guild } from './Guild.js';
import type { APIGuildMember } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';

/** Represents a member of a guild. */
export class GuildMember extends Base {
  readonly client: Client;
  readonly id: string;
  readonly user: User;
  readonly guild: Guild;
  nick: string | null;
  readonly roles: string[];
  readonly joinedAt: Date;
  communicationDisabledUntil: Date | null;

  /** @param data - API guild member from GET /guilds/{id}/members or GET /guilds/{id}/members/{user_id} */
  constructor(client: Client, data: APIGuildMember & { guild_id?: string }, guild: Guild) {
    super();
    this.client = client;
    this.user = new User(client, data.user);
    this.id = data.user.id;
    this.guild = guild;
    this.nick = data.nick ?? null;
    this.roles = data.roles ?? [];
    this.joinedAt = new Date(data.joined_at);
    this.communicationDisabledUntil = data.communication_disabled_until ? new Date(data.communication_disabled_until) : null;
  }

  /** Nickname, or global name, or username. */
  get displayName(): string {
    return this.nick ?? this.user.globalName ?? this.user.username;
  }

  /**
   * Add a role to this member.
   * @param roleId - The role ID to add
   * Requires Manage Roles permission.
   */
  async addRole(roleId: string): Promise<void> {
    await this.client.rest.put(Routes.guildMemberRole(this.guild.id, this.id, roleId));
  }

  /**
   * Remove a role from this member.
   * @param roleId - The role ID to remove
   * Requires Manage Roles permission.
   */
  async removeRole(roleId: string): Promise<void> {
    await this.client.rest.delete(Routes.guildMemberRole(this.guild.id, this.id, roleId));
  }
}
