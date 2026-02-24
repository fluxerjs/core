import { describe, it, expect } from 'vitest';
import { Client, User } from '../';

function createMockClient() {
  return {} as Client;
}

function createUser(
  overrides: Partial<{
    id: string;
    username: string;
    avatar: string | null;
    banner: string | null;
  }> = {},
) {
  return new User(createMockClient(), {
    id: overrides.id ?? '123456789012345678',
    username: overrides.username ?? 'TestUser',
    discriminator: '0',
    avatar: overrides.avatar ?? null,
    banner: overrides.banner ?? null,
  });
}

describe('User', () => {
  describe('toString()', () => {
    it('returns user mention format', () => {
      const user = createUser({ id: '987654321098765432' });
      expect(user.toString()).toBe('<@987654321098765432>');
    });
  });

  describe('avatarURL()', () => {
    it('returns null when avatar is null', () => {
      const user = createUser({ avatar: null });
      expect(user.avatarURL()).toBeNull();
    });

    it('builds avatar URL with default png extension', () => {
      const user = createUser({ avatar: 'abc123hash' });
      const url = user.avatarURL();
      expect(url).toContain('fluxerusercontent.com/avatars/123456789012345678/abc123hash.png');
    });

    it('uses gif for animated avatar (a_ prefix)', () => {
      const user = createUser({ avatar: 'a_animatedhash' });
      const url = user.avatarURL();
      expect(url).toContain('.gif');
    });

    it('appends size when provided', () => {
      const user = createUser({ avatar: 'hash' });
      const url = user.avatarURL({ size: 256 });
      expect(url).toContain('?size=256');
    });
  });

  describe('displayAvatarURL()', () => {
    it('returns default avatar URL when no custom avatar', () => {
      const user = createUser({ avatar: null });
      const url = user.displayAvatarURL();
      expect(url).toContain('fluxerstatic.com/avatars/');
    });

    it('returns custom avatar URL when avatar is set', () => {
      const user = createUser({ avatar: 'custom' });
      const url = user.displayAvatarURL();
      expect(url).toContain('fluxerusercontent.com/avatars/');
    });
  });

  describe('bannerURL()', () => {
    it('returns null when banner is null', () => {
      const user = createUser({ banner: null });
      expect(user.bannerURL()).toBeNull();
    });

    it('builds banner URL when banner is set', () => {
      const user = createUser({ banner: 'bannerhash' });
      const url = user.bannerURL();
      expect(url).toContain('fluxerusercontent.com/banners/123456789012345678/bannerhash.png');
    });
  });

  describe('constructor', () => {
    it('parses API user data', () => {
      const user = createUser({
        id: '111',
        username: 'Alice',
        avatar: 'av',
        banner: 'bn',
      });
      expect(user.id).toBe('111');
      expect(user.username).toBe('Alice');
      expect(user.avatar).toBe('av');
      expect(user.banner).toBe('bn');
    });

    it('handles optional fields', () => {
      const user = new User(createMockClient(), {
        id: '1',
        username: 'Bot',
        discriminator: '0',
      });
      expect(user.globalName).toBeNull();
      expect(user.avatar).toBeNull();
      expect(user.bot).toBe(false);
    });
  });
});
