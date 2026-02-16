import { describe, it, expect } from 'vitest';
import { Role } from './Role.js';
import { PermissionFlags } from '@fluxerjs/util';

function createMockClient() {
  return {} as Parameters<typeof Role>[0];
}

describe('Role', () => {
  it('has() returns true when role has Administrator', () => {
    const role = new Role(
      createMockClient(),
      {
        permissions: '8',
        id: '1',
        name: 'Admin',
        color: 0,
        position: 0,
        hoist: false,
        mentionable: false,
      },
      'guild1',
    );
    expect(role.has(PermissionFlags.Administrator)).toBe(true);
    expect(role.has(PermissionFlags.SendMessages)).toBe(true);
  });

  it('has() returns true when role has specific permission', () => {
    const role = new Role(
      createMockClient(),
      {
        permissions: '2048',
        id: '1',
        name: 'Sender',
        color: 0,
        position: 0,
        hoist: false,
        mentionable: false,
      },
      'guild1',
    );
    expect(role.has(PermissionFlags.SendMessages)).toBe(true);
    expect(role.has(PermissionFlags.BanMembers)).toBe(false);
  });

  it('has() returns false for undefined permission name', () => {
    const role = new Role(
      createMockClient(),
      {
        permissions: '2048',
        id: '1',
        name: 'R',
        color: 0,
        position: 0,
        hoist: false,
        mentionable: false,
      },
      'guild1',
    );
    expect(role.has('NonExistent' as never)).toBe(false);
  });
});
