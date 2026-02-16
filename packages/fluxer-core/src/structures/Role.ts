import type { Client } from '../client/Client.js';
import { Base } from './Base.js';
import type { APIRole } from '@fluxerjs/types';
import { PermissionFlags, type PermissionResolvable } from '@fluxerjs/util';

/** Represents a role in a guild. */
export class Role extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  unicodeEmoji: string | null;
  /** Separately sorted position for hoisted roles. Null if not set. */
  hoistPosition: number | null;

  /** @param client - The client instance */
  /** @param data - API role from GET /guilds/{id}/roles or gateway role events */
  /** @param guildId - The guild this role belongs to */
  constructor(client: Client, data: APIRole, guildId: string) {
    super();
    this.client = client;
    this.id = data.id;
    this.guildId = guildId;
    this.name = data.name;
    this.color = data.color;
    this.position = data.position;
    this.permissions = data.permissions;
    this.hoist = !!data.hoist;
    this.mentionable = !!data.mentionable;
    this.unicodeEmoji = data.unicode_emoji ?? null;
    this.hoistPosition = data.hoist_position ?? null;
  }

  /** Returns a mention string (e.g. `<@&123456>`). */
  toString(): string {
    return `<@&${this.id}>`;
  }

  /**
   * Check if this role has a permission. Administrator grants all permissions.
   * @param permission - Permission flag, name, or resolvable
   * @returns true if the role has the permission
   * @example
   * if (role.has(PermissionFlags.BanMembers)) { ... }
   * if (role.has('ManageChannels')) { ... }
   */
  has(permission: PermissionResolvable): boolean {
    const perm =
      typeof permission === 'number'
        ? permission
        : PermissionFlags[permission as keyof typeof PermissionFlags];
    if (perm === undefined) return false;
    const permNum = Number(perm);
    const rolePerms = BigInt(this.permissions);
    const permBig = BigInt(permNum);
    if (permBig < 0) return false;
    if ((rolePerms & BigInt(PermissionFlags.Administrator)) !== 0n) return true;
    return (rolePerms & permBig) === permBig;
  }
}
