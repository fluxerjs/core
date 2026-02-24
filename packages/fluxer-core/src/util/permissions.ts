import { OverwriteType, type APIChannelOverwrite } from '@fluxerjs/types';
import { ALL_PERMISSIONS_BIGINT, PermissionFlags } from '@fluxerjs/util';

/**
 * Compute the effective permission bitfield for a member in a channel.
 * Applies role permissions and channel overwrites.
 * Guild owner always receives all permissions (matches Fluxer API behavior).
 * @param basePermissions - Combined permissions from all member roles (guild base)
 * @param overwrites - Channel permission overwrites
 * @param memberRoles - Role IDs the member has
 * @param memberId - Member user ID (for member-specific overwrites)
 * @param isOwner - Whether the member is the guild owner (gets all permissions)
 * @returns Effective permission bitfield as bigint
 */
export function computePermissions(
  basePermissions: bigint,
  overwrites: APIChannelOverwrite[],
  memberRoles: string[],
  memberId: string,
  isOwner: boolean,
): bigint {
  if (isOwner) return ALL_PERMISSIONS_BIGINT;
  let perms = basePermissions;
  for (const overwrite of overwrites ?? []) {
    const applies =
      (overwrite.type === OverwriteType.Role && memberRoles.includes(overwrite.id)) ||
      (overwrite.type === OverwriteType.Member && overwrite.id === memberId);
    if (!applies) continue;
    const allow = BigInt(overwrite.allow || '0');
    const deny = BigInt(overwrite.deny || '0');
    perms = (perms & ~deny) | allow;
  }
  return (perms & PermissionFlags.Administrator) !== 0n ? ALL_PERMISSIONS_BIGINT : perms;
}

/**
 * Check if a permission bitfield has a specific permission.
 * Administrator (bit 3) implies all permissions per Fluxer/Discord convention.
 */
export function hasPermission(bitfield: bigint, permission: bigint): boolean {
  if ((bitfield & PermissionFlags.Administrator) !== 0n) return true;
  return (bitfield & permission) !== 0n;
}
