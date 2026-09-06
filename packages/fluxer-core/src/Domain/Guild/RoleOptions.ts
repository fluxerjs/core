import type { PermissionResolvable } from '@fluxerjs/util';

/**
 * CamelCase options for creating a guild role.
 * Fluxer create accepts `name`, `color`, and `permissions` only.
 */
export interface RoleCreateOptions {
  /** Role name. */
  name?: string;
  /** Permissions bitfield string or {@link PermissionResolvable}. */
  permissions?: string | PermissionResolvable;
  /** Role color as 24-bit RGB. */
  color?: number;
}

/**
 * CamelCase options for editing a guild role.
 * Fluxer update accepts `name`, `color`, `permissions`, `hoist`, `hoist_position`, `mentionable`.
 * `unicodeEmoji` is read-only on {@link Role}. Position changes use {@link Guild.setRolePositions}.
 */
export interface RoleEditOptions {
  /** Role name. */
  name?: string;
  /** Permissions bitfield string or {@link PermissionResolvable}. */
  permissions?: string | PermissionResolvable;
  /** Role color as 24-bit RGB. */
  color?: number;
  /** Whether the role is displayed separately in the member list. */
  hoist?: boolean;
  /** Whether the role can be @mentioned. */
  mentionable?: boolean;
  /** Hoisted position (visual separator group). */
  hoistPosition?: number | null;
}
