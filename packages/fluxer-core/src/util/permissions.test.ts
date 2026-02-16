import { describe, it, expect } from 'vitest';
import { computePermissions, hasPermission } from './permissions.js';
import { OverwriteType } from '@fluxerjs/types';
import { PermissionFlags } from '@fluxerjs/util';

describe('hasPermission', () => {
  it('returns true when Administrator is set', () => {
    expect(hasPermission(8n, 8n)).toBe(true);
    expect(hasPermission(8n, 2048n)).toBe(true); // Administrator grants SendMessages
  });

  it('returns true when specific permission is set', () => {
    expect(hasPermission(2048n, 2048n)).toBe(true); // SendMessages
  });

  it('returns false when permission not set', () => {
    expect(hasPermission(0n, 2048n)).toBe(false);
  });
});

describe('computePermissions', () => {
  it('returns full permissions when owner (including high-bit Fluxer perms)', () => {
    const perms = computePermissions(0n, [], [], 'user1', true);
    expect(hasPermission(perms, 2048n)).toBe(true); // SendMessages
    expect(hasPermission(perms, BigInt(PermissionFlags.BanMembers))).toBe(true);
    expect(hasPermission(perms, BigInt(PermissionFlags.ManageRoles))).toBe(true);
    expect(hasPermission(perms, BigInt(PermissionFlags.PinMessages))).toBe(true); // bit 51
    expect(hasPermission(perms, BigInt(PermissionFlags.BypassSlowmode))).toBe(true); // bit 52
  });

  it('applies role overwrites', () => {
    const base = 2048n; // SendMessages
    const overwrites = [
      { id: 'role1', type: OverwriteType.Role, allow: '0', deny: '2048' }, // Deny SendMessages for role1
    ];
    const perms = computePermissions(base, overwrites, ['role1'], 'user1', false);
    expect(hasPermission(perms, 2048n)).toBe(false);
  });

  it('applies member overwrites', () => {
    const base = 0n;
    const overwrites = [
      { id: 'user1', type: OverwriteType.Member, allow: '2048', deny: '0' }, // Allow SendMessages for user1
    ];
    const perms = computePermissions(base, overwrites, [], 'user1', false);
    expect(hasPermission(perms, 2048n)).toBe(true);
  });
});
