import { Client } from '../client/Client.js';
import { Base } from './Base.js';
import { APIRole, RESTUpdateRoleBody } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import {
  PermissionFlags,
  resolvePermissionsToBitfield,
  type PermissionResolvable,
  ALL_PERMISSIONS_BIGINT,
  PermissionsBitField,
} from '@fluxerjs/util';

/** Represents a role in a guild. */
export class Role extends Base {
  readonly client: Client;
  readonly id: string;
  readonly guildId: string;
  name: string;
  color: number;
  position: number;
  _permissions: string;
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
    this._permissions = data.permissions;
    this.hoist = !!data.hoist;
    this.mentionable = !!data.mentionable;
    this.unicodeEmoji = data.unicode_emoji ?? null;
    this.hoistPosition = data.hoist_position ?? null;
  }

  get permissions(): PermissionsBitField {
    const bits = BigInt(this._permissions);
    return new PermissionsBitField( (bits & PermissionFlags.Administrator) !== 0n ? ALL_PERMISSIONS_BIGINT : bits );
  }

  /** Update mutable fields from fresh API data. Used by edit and gateway events. */
  _patch(data: Partial<APIRole>): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.color !== undefined) this.color = data.color;
    if (data.position !== undefined) this.position = data.position;
    if (data.permissions !== undefined) this._permissions = data.permissions;
    if (data.hoist !== undefined) this.hoist = !!data.hoist;
    if (data.mentionable !== undefined) this.mentionable = !!data.mentionable;
    if (data.unicode_emoji !== undefined) this.unicodeEmoji = data.unicode_emoji ?? null;
    if (data.hoist_position !== undefined) this.hoistPosition = data.hoist_position ?? null;
  }

  /** Returns a mention string (e.g. `<@&123456>`). */
  toString(): string {
    return `<@&${this.id}>`;
  }

  /**
   * Edit this role.
   * Requires Manage Roles permission.
   * @param options - Role updates (permissions accepts PermissionResolvable for convenience)
   * @returns This role (updated in place)
   * @example
   * await role.edit({ name: 'Moderator', permissions: ['BanMembers', 'KickMembers'] });
   */
  async edit(
    options: RESTUpdateRoleBody & { permissions?: string | PermissionResolvable },
  ): Promise<Role> {
    const body: Record<string, unknown> = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.permissions !== undefined) {
      body.permissions =
        typeof options.permissions === 'string'
          ? options.permissions
          : resolvePermissionsToBitfield(options.permissions);
    }
    if (options.color !== undefined) body.color = options.color;
    if (options.hoist !== undefined) body.hoist = options.hoist;
    if (options.mentionable !== undefined) body.mentionable = options.mentionable;
    if (options.unicode_emoji !== undefined) body.unicode_emoji = options.unicode_emoji;
    if (options.position !== undefined) body.position = options.position;
    if (options.hoist_position !== undefined) body.hoist_position = options.hoist_position;
    const data = await this.client.rest.patch<APIRole>(Routes.guildRole(this.guildId, this.id), {
      body: Object.keys(body).length ? body : undefined,
      auth: true,
    });
    this._patch(data);
    return this;
  }

  /**
   * Delete this role.
   * Requires Manage Roles permission.
   */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.guildRole(this.guildId, this.id), { auth: true });
    const guild = this.client.guilds.get(this.guildId);
    if (guild) guild.roles.delete(this.id);
  }
}
