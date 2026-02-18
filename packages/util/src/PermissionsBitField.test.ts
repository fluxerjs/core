import { describe, it, expect } from 'vitest';
import {
  resolvePermissionsToBitfield,
  PermissionFlags,
  PermissionsBitField,
} from './PermissionsBitField.js';

describe('resolvePermissionsToBitfield', () => {
  it('returns string as-is when it looks like a number', () => {
    expect(resolvePermissionsToBitfield('2048')).toBe('2048');
    expect(resolvePermissionsToBitfield('8933636165185')).toBe('8933636165185');
  });

  it('resolves PermissionString to bitfield', () => {
    expect(resolvePermissionsToBitfield('SendMessages')).toBe('2048');
    expect(resolvePermissionsToBitfield('Administrator')).toBe('8');
  });

  it('resolves number to string', () => {
    expect(resolvePermissionsToBitfield(2048)).toBe('2048');
    expect(resolvePermissionsToBitfield(PermissionFlags.SendMessages)).toBe('2048');
  });

  it('resolves bigint to string', () => {
    expect(resolvePermissionsToBitfield(2048n)).toBe('2048');
  });

  it('resolves array of permissions with OR', () => {
    const result = resolvePermissionsToBitfield(['SendMessages', 'ViewChannel']);
    expect(result).toBe(String(2048 | 1024)); // 3072
  });

  it('resolves PermissionsBitField instance', () => {
    const bf = new PermissionsBitField([PermissionFlags.BanMembers]);
    expect(resolvePermissionsToBitfield(bf)).toBe('4');
  });

  it('throws for invalid permission string', () => {
    expect(() => resolvePermissionsToBitfield('InvalidPermission')).toThrow(RangeError);
  });
});
