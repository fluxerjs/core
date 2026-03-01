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

describe('PermissionsBitField', () => {
  it('uses the intended bit positions for high-bit permissions', () => {
    expect(PermissionFlags.UseExternalStickers).toBe(1n << 37n);
    expect(PermissionFlags.ModerateMembers).toBe(1n << 40n);
    expect(PermissionFlags.CreateExpressions).toBe(1n << 43n);
    expect(PermissionFlags.PinMessages).toBe(1n << 51n);
    expect(PermissionFlags.BypassSlowmode).toBe(1n << 52n);
    expect(PermissionFlags.UpdateRtcRegion).toBe(1n << 53n);
  });

  it('has checks single permission', () => {
    const bf = new PermissionsBitField([PermissionFlags.SendMessages]);
    expect(bf.has(PermissionFlags.SendMessages)).toBe(true);
    expect(bf.has(PermissionFlags.BanMembers)).toBe(false);
  });

  it('has checks Administrator flag', () => {
    const bf = new PermissionsBitField([PermissionFlags.Administrator]);
    expect(bf.has(PermissionFlags.Administrator)).toBe(true);
    expect(bf.has(PermissionFlags.BanMembers)).toBe(false);
  });

  it('toArray returns permission names', () => {
    const bf = new PermissionsBitField([PermissionFlags.SendMessages, PermissionFlags.ViewChannel]);
    const arr = bf.toArray();
    expect(arr).toContain('SendMessages');
    expect(arr).toContain('ViewChannel');
    expect(arr.length).toBe(2);
  });

  it('serialize returns permission object', () => {
    const bf = new PermissionsBitField([PermissionFlags.BanMembers]);
    const s = bf.serialize();
    expect(s.BanMembers).toBe(true);
    expect(s.SendMessages).toBe(false);
  });
});
