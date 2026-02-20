import { Collection } from '@fluxerjs/collection';
import { Routes } from '@fluxerjs/types';
import type { GuildMember } from './GuildMember.js';
import type { Role } from './Role.js';

/** Role ID or Role object for add/remove. */
export type RoleResolvable = string | Role;

/**
 * Manages a guild member's roles with add/remove/set and a cache of Role objects.
 * Discord.js parity: member.roles.add(), member.roles.remove(), member.roles.set(), member.roles.cache
 *
 * @discordJsCompat https://discord.js.org/docs/packages/discord.js/main/GuildMemberRoleManager
 * @example
 * // Add a role (Discord.js style)
 * await member.roles.add(roleId);
 *
 * @example
 * // Remove a role
 * await member.roles.remove(roleId);
 *
 * @example
 * // Replace all roles
 * await member.roles.set(['roleId1', 'roleId2']);
 *
 * @example
 * // Check if member has a role
 * if (member.roles.cache.has(roleId)) { ... }
 */
export class GuildMemberRoleManager {
  private _roleIds: string[] = [];

  constructor(
    private readonly member: GuildMember,
    initialRoleIds: string[] = [],
  ) {
    this._roleIds = [...initialRoleIds];
  }

  /** Role IDs for this member. Used by permissions; prefer cache for Role objects. */
  get roleIds(): readonly string[] {
    return this._roleIds;
  }

  /** Check if the member has a role. Discord.js parity: member.roles.cache.has(roleId) */
  has(roleOrId: RoleResolvable): boolean {
    return this._roleIds.includes(this._resolveId(roleOrId));
  }

  /**
   * Collection of Role objects for this member's roles (from guild.roles).
   * Discord.js parity: member.roles.cache
   * @discordJsCompat https://discord.js.org/docs/packages/discord.js/main/GuildMemberRoleManager
   */
  get cache(): Collection<string, Role> {
    const coll = new Collection<string, Role>();
    for (const id of this._roleIds) {
      const role = this.member.guild.roles.get(id);
      if (role) coll.set(id, role);
    }
    return coll;
  }

  /** Resolve role ID from RoleResolvable. */
  private _resolveId(roleOrId: RoleResolvable): string {
    return typeof roleOrId === 'string' ? roleOrId : roleOrId.id;
  }

  /**
   * Add a role to this member.
   * Discord.js parity: member.roles.add(roleId)
   * Requires Manage Roles permission.
   * @discordJsCompat https://discord.js.org/docs/packages/discord.js/main/GuildMemberRoleManager
   */
  async add(roleOrId: RoleResolvable): Promise<void> {
    const roleId = this._resolveId(roleOrId);
    if (this._roleIds.includes(roleId)) return;
    await this.member.client.rest.put(
      Routes.guildMemberRole(this.member.guild.id, this.member.id, roleId),
    );
    this._roleIds.push(roleId);
  }

  /**
   * Remove a role from this member.
   * Discord.js parity: member.roles.remove(roleId)
   * Requires Manage Roles permission.
   * @discordJsCompat https://discord.js.org/docs/packages/discord.js/main/GuildMemberRoleManager
   */
  async remove(roleOrId: RoleResolvable): Promise<void> {
    const roleId = this._resolveId(roleOrId);
    const idx = this._roleIds.indexOf(roleId);
    if (idx === -1) return;
    await this.member.client.rest.delete(
      Routes.guildMemberRole(this.member.guild.id, this.member.id, roleId),
    );
    this._roleIds.splice(idx, 1);
  }

  /**
   * Replace all roles for this member. PATCH /guilds/{id}/members/{userId}
   * Discord.js parity: member.roles.set(roleIds)
   * Requires Manage Roles permission.
   * @discordJsCompat https://discord.js.org/docs/packages/discord.js/main/GuildMemberRoleManager
   */
  async set(roleIds: string[]): Promise<void> {
    const data = await this.member.client.rest.patch<import('@fluxerjs/types').APIGuildMember>(
      Routes.guildMember(this.member.guild.id, this.member.id),
      { body: { roles: roleIds }, auth: true },
    );
    this._roleIds = data.roles ? [...data.roles] : [];
  }

  /**
   * Update internal role IDs from API response. Called by GuildMember.edit().
   * @internal
   */
  _patch(roleIds: string[]): void {
    this._roleIds = [...roleIds];
  }
}
