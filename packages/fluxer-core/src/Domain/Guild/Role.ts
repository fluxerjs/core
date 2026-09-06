import type { APIRole } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import {
  ALL_PERMISSIONS_BIGINT,
  PermissionFlags,
  PermissionsBitField,
  SnowflakeUtil,
} from '@fluxerjs/util';

import type { Client } from '../../ClientCore/Client.js';
import { toRoleEditBody } from '../../ClientCore/SdkOptions/Guild.js';
import { Base } from '../Base.js';
import type { RoleEditOptions } from './RoleOptions.js';

/**
 * Guild role.
 * Cached in {@link Guild.roles}; permissions computed via {@link GuildMember.permissions}.
 */
export class Role extends Base {
  /** Parent client instance. */
  readonly client: Client;
  /** Role snowflake ID. */
  readonly id: string;
  /** Guild this role belongs to. */
  readonly guildId: string;
  /** Role name. */
  name: string;
  /** Role color (24-bit RGB). */
  color: number;
  /** Role position (higher = above). */
  position: number;
  /** @internal Raw permissions bitfield string. */
  _permissions: string;
  /** Whether this role is hoisted (shown separately in member list). */
  hoist: boolean;
  /** Whether this role is mentionable. */
  mentionable: boolean;
  /** Unicode emoji for this role (null = none). */
  unicodeEmoji: string | null;
  /** Hoist position (null = not hoisted). */
  hoistPosition: number | null;

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

  /**
   * Permissions bitfield (Administrator grants all permissions).
   */
  get permissions(): PermissionsBitField {
    const bits = BigInt(this._permissions);
    return new PermissionsBitField(
      (bits & PermissionFlags.Administrator) !== 0n ? ALL_PERMISSIONS_BIGINT : bits,
    );
  }

  /**
   * Alias of {@link permissions}.has for discord.js-style checks.
   * @example
   * if (role.has(PermissionFlags.BanMembers)) { ... }
   */
  has(permission: Parameters<PermissionsBitField['has']>[0]): boolean {
    return this.permissions.has(permission);
  }

  /**
   * Format as a mention string (`<@&id>`).
   * @returns Mention syntax
   */
  /** Unix timestamp (ms) when this role was created, derived from its snowflake ID. */
  get createdTimestamp(): number {
    return SnowflakeUtil.timestampFromSnowflake(this.id);
  }

  /** Date when this role was created, derived from its snowflake ID. */
  get createdAt(): Date {
    return SnowflakeUtil.dateFromSnowflake(this.id);
  }

  toString(): string {
    return `<@&${this.id}>`;
  }

  /** @internal */
  _patch(data: APIRole): void {
    this.name = data.name;
    this.color = data.color;
    this.position = data.position;
    this._permissions = data.permissions;
    this.hoist = !!data.hoist;
    this.mentionable = !!data.mentionable;
    this.unicodeEmoji = data.unicode_emoji ?? null;
    this.hoistPosition = data.hoist_position ?? null;
  }

  /**
   * Snapshot for role-update events (before in-place patch).
   * @internal
   */
  _clone(): Role {
    return new Role(
      this.client,
      {
        id: this.id,
        name: this.name,
        color: this.color,
        position: this.position,
        permissions: this._permissions,
        hoist: this.hoist,
        mentionable: this.mentionable,
        unicode_emoji: this.unicodeEmoji,
        hoist_position: this.hoistPosition,
      },
      this.guildId,
    );
  }

  /**
   * PATCH role. Requires Manage Roles.
   * @param options - CamelCase fields to update
   * @returns This role instance (updated in-place)
   */
  async edit(options: RoleEditOptions): Promise<Role> {
    const body = toRoleEditBody(options);
    const data = await this.client.rest.patch<APIRole>(Routes.guildRole(this.guildId, this.id), {
      body: Object.keys(body).length ? body : undefined,
      auth: true,
    });
    this._patch(data);
    return this;
  }

  /**
   * DELETE role. Requires Manage Roles.
   */
  async delete(): Promise<void> {
    await this.client.rest.delete(Routes.guildRole(this.guildId, this.id), { auth: true });
    this.client.guilds.get(this.guildId)?.roles.delete(this.id);
  }
}
