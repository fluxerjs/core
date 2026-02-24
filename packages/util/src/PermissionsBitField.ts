import { BitField, type BitFieldResolvable } from './BitField.js';

/**
 * Permission flags aligned with Fluxer API (fluxer_api/src/constants/Channel.ts).
 * Bits 0–30 use 1<<n; bits 31+ use 2**n.
 * Administrator (bit 3) implies all permissions. Guild owner bypasses role computation.
 *
 * @example
 * if (member.permissions.has(PermissionFlags.BanMembers)) { ... }
 * if (perms.has(PermissionFlags.Administrator)) { ... }
 */
export const PermissionFlags = {
  CreateInstantInvite     : 1n << 0n,
  KickMembers             : 1n << 1n,
  BanMembers              : 1n << 2n,
  Administrator           : 1n << 3n,
  ManageChannels          : 1n << 4n,
  ManageGuild             : 1n << 5n,
  AddReactions            : 1n << 6n,
  ViewAuditLog            : 1n << 7n,
  PrioritySpeaker         : 1n << 8n,
  Stream                  : 1n << 9n,
  ViewChannel             : 1n << 10n,
  SendMessages            : 1n << 11n,
  SendTtsMessages         : 1n << 12n,
  ManageMessages          : 1n << 13n,
  EmbedLinks              : 1n << 14n,
  AttachFiles             : 1n << 15n,
  ReadMessageHistory      : 1n << 16n,
  MentionEveryone         : 1n << 17n,
  UseExternalEmojis       : 1n << 18n,
  Connect                 : 1n << 20n,
  Speak                   : 1n << 21n,
  MuteMembers             : 1n << 22n,
  DeafenMembers           : 1n << 23n,
  MoveMembers             : 1n << 24n,
  UseVad                  : 1n << 25n,
  ChangeNickname          : 1n << 26n,
  ManageNicknames         : 1n << 27n,
  ManageRoles             : 1n << 28n,
  ManageWebhooks          : 1n << 29n,
  ManageEmojisAndStickers : 1n << 30n,
  ManageExpressions       : 1n << 30n,
  UseExternalStickers     : 2n << 37n,
  ModerateMembers         : 2n << 40n,
  CreateExpressions       : 2n << 43n,
  PinMessages             : 2n << 51n,
  BypassSlowmode          : 2n << 52n,
  UpdateRtcRegion         : 2n << 53n,
} as const;


/** BigInt OR of all permission flags. Used for guild owner override (owner has all perms). */
export const ALL_PERMISSIONS_BIGINT = Object.values(PermissionFlags).reduce((a, b) => a | b, 0n);

export type PermissionString = keyof typeof PermissionFlags;

export class PermissionsBitField extends BitField<PermissionString> {
  static override Flags = PermissionFlags;
}

export type PermissionResolvable = BitFieldResolvable<PermissionString>;

/**
 * Resolve permission(s) to an API bitfield string. Uses BigInt to avoid overflow for flags > 2^31.
 * @param perms - Permission string (e.g. "2048"), number, PermissionString, array of permissions, or PermissionsBitField
 * @returns String bitfield for API (e.g. "8933636165185")
 * @example
 * resolvePermissionsToBitfield('2048'); // "2048"
 * resolvePermissionsToBitfield(PermissionFlags.SendMessages); // "2048"
 * resolvePermissionsToBitfield(['SendMessages', 'ViewChannel']); // combined bitfield
 */
export function resolvePermissionsToBitfield(perms: PermissionResolvable): string {
  if (typeof perms === 'string') {
    const num = Number(perms);
    if (!Number.isNaN(num) && perms.trim() !== '') return perms;
    const mapped = PermissionFlags[perms];
    if (mapped !== undefined) return String(mapped);
    throw new RangeError(`Invalid permission string: ${perms}`);
  }
  if (typeof perms === 'number') return String(perms);
  if (typeof perms === 'bigint') return String(perms);
  if (perms instanceof PermissionsBitField) return String(BigInt(perms.bitfield));
  if (Array.isArray(perms)) {
    let acc = 0n;
    for (const p of perms) {
      let v: bigint;
      if (typeof p === 'number') v = BigInt(p);
      else if (typeof p === 'string') {
        const mapped = PermissionFlags[p];
        v = mapped !== undefined ? BigInt(mapped) : BigInt(Number(p) || 0);
      } else v = BigInt((p as PermissionsBitField).bitfield);
      acc |= v;
    }
    return String(acc);
  }
  throw new RangeError(`Invalid permission resolvable: ${perms}`);
}
