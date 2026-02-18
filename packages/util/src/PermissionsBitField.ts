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
export enum PermissionFlags {
  CreateInstantInvite = 1 << 0,
  KickMembers = 1 << 1,
  BanMembers = 1 << 2,
  Administrator = 1 << 3,
  ManageChannels = 1 << 4,
  ManageGuild = 1 << 5,
  AddReactions = 1 << 6,
  ViewAuditLog = 1 << 7,
  PrioritySpeaker = 1 << 8,
  Stream = 1 << 9,
  ViewChannel = 1 << 10,
  SendMessages = 1 << 11,
  SendTtsMessages = 1 << 12,
  ManageMessages = 1 << 13,
  EmbedLinks = 1 << 14,
  AttachFiles = 1 << 15,
  ReadMessageHistory = 1 << 16,
  MentionEveryone = 1 << 17,
  UseExternalEmojis = 1 << 18,
  Connect = 1 << 20,
  Speak = 1 << 21,
  MuteMembers = 1 << 22,
  DeafenMembers = 1 << 23,
  MoveMembers = 1 << 24,
  UseVad = 1 << 25,
  ChangeNickname = 1 << 26,
  ManageNicknames = 1 << 27,
  ManageRoles = 1 << 28,
  ManageWebhooks = 1 << 29,
  ManageEmojisAndStickers = 1 << 30,
  ManageExpressions = 1 << 30,
  UseExternalStickers = 2 ** 37,
  ModerateMembers = 2 ** 40,
  CreateExpressions = 2 ** 43,
  PinMessages = 2 ** 51,
  BypassSlowmode = 2 ** 52,
  UpdateRtcRegion = 2 ** 53,
}

/** Forward mapping (name -> number) for lookups. Enum has reverse mappings we must avoid. */
export const PermissionFlagsMap: Record<string, number> = {};
for (const [k, v] of Object.entries(PermissionFlags)) {
  if (typeof v === 'number') PermissionFlagsMap[k] = v;
}

/** BigInt OR of all permission flags. Used for guild owner override (owner has all perms). */
export const ALL_PERMISSIONS_BIGINT: bigint = (() => {
  let acc = 0n;
  const seen = new Set<number>();
  for (const v of Object.values(PermissionFlagsMap)) {
    if (!seen.has(v)) {
      seen.add(v);
      acc |= BigInt(v);
    }
  }
  return acc;
})();

export type PermissionString = keyof typeof PermissionFlagsMap;

export class PermissionsBitField extends BitField<PermissionString> {
  static override Flags = PermissionFlagsMap;
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
    const mapped = PermissionFlagsMap[perms];
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
        const mapped = PermissionFlagsMap[p];
        v = mapped !== undefined ? BigInt(mapped) : BigInt(Number(p) || 0);
      } else v = BigInt((p as PermissionsBitField).bitfield);
      acc |= v;
    }
    return String(acc);
  }
  throw new RangeError(`Invalid permission resolvable: ${perms}`);
}
