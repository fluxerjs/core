import { describe, it, expect } from 'vitest';
import { Client, Role } from '../';
import { PermissionFlags } from '@fluxerjs/util';

function createMockClient() {
  return {} as Client;
}

function createRole(permissions: string | bigint, overrides: Partial<{ id: string; name: string }> = {}) {
  return new Role(
    createMockClient(),
    {
      permissions: permissions.toString(),
      id: overrides.id ?? '1',
      name: overrides.name ?? 'Role',
      color: 0,
      position: 0,
      hoist: false,
      mentionable: false,
    },
    'guild1',
  );
}

describe('Role.permissions', () => {
  describe('has()', () => {
    it('returns true when role has Administrator (grants all permissions)', () => {
      const role = createRole(PermissionFlags.Administrator); // 1 << 3 = Administrator
      expect(role.permissions.has(PermissionFlags.Administrator)).toBe(true);
      expect(role.permissions.has(PermissionFlags.SendMessages)).toBe(true);
      expect(role.permissions.has(PermissionFlags.BanMembers)).toBe(true);
      expect(role.permissions.has(PermissionFlags.ManageChannels)).toBe(true);
    });

    it('returns true when role has specific permission', () => {
      const role = createRole('2048'); // SendMessages
      expect(role.permissions.has(PermissionFlags.SendMessages)).toBe(true);
      expect(role.permissions.has(PermissionFlags.BanMembers)).toBe(false);
      expect(role.permissions.has(PermissionFlags.ViewChannel)).toBe(false);
    });

    it('returns true for string permission name', () => {
      const role = createRole(PermissionFlags.SendMessages);
      expect(role.permissions.has('SendMessages')).toBe(true);
      expect(role.permissions.has('BanMembers')).toBe(false);
    });

    it('returns false when role has no permissions', () => {
      const role = createRole('0');
      expect(role.permissions.has(PermissionFlags.SendMessages)).toBe(false);
      expect(role.permissions.has(PermissionFlags.Administrator)).toBe(false);
    });

    it('throws an error for invalid permission name', () => {
      const role = createRole(PermissionFlags.Administrator);
      expect(() => role.permissions.has('NonExistent' as never)).toThrow(RangeError);
    });

    it('handles combined permission bitfield', () => {
      // SendMessages (2048) | ViewChannel (1024) = 3072
      const role = createRole( String(PermissionFlags.SendMessages | PermissionFlags.ViewChannel) );
      expect(role.permissions.has(PermissionFlags.SendMessages)).toBe(true);
      expect(role.permissions.has(PermissionFlags.ViewChannel)).toBe(true);
      expect(role.permissions.has(PermissionFlags.BanMembers)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('returns role mention format', () => {
      const role = createRole('0', { id: '123456789' });
      expect(role.toString()).toBe('<@&123456789>');
    });
  });
});
