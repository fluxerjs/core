import { describe, expect, it } from 'vitest';
import { type Client, Guild } from '../';
import { fixtureGuild } from '../test/fixtures.js';
import { DEFAULT_INSTANCE_ENDPOINTS } from '../util/instance.js';

function createMockClient() {
  return {
    instance: { endpoints: DEFAULT_INSTANCE_ENDPOINTS, discovery: null },
  } as Client;
}

function createGuild(
  overrides: {
    id?: string;
    icon?: string | null;
    banner?: string | null;
    splash?: string | null;
  } = {},
) {
  return new Guild(createMockClient(), {
    id: overrides.id ?? 'guild1',
    name: 'Test Guild',
    icon: overrides.icon ?? null,
    banner: overrides.banner ?? null,
    splash: overrides.splash ?? null,
    owner_id: 'owner1',
    features: [],
    afk_timeout: 0,
    nsfw_level: 0,
    verification_level: 0,
    mfa_level: 0,
    explicit_content_filter: 0,
    default_message_notifications: 0,
  });
}

describe('Guild', () => {
  describe('iconURL()', () => {
    it('returns null when icon is null', () => {
      const guild = createGuild({ icon: null });
      expect(guild.iconURL()).toBeNull();
    });

    it('builds icon URL when icon is set', () => {
      const guild = createGuild({ icon: 'iconhash123' });
      const url = guild.iconURL();
      expect(url).toContain('fluxerusercontent.com/icons/guild1/iconhash123.png');
    });

    it('appends size when provided', () => {
      const guild = createGuild({ icon: 'hash' });
      const url = guild.iconURL({ size: 512 });
      expect(url).toContain('?size=512');
    });
  });

  describe('bannerURL()', () => {
    it('returns null when banner is null', () => {
      const guild = createGuild({ banner: null });
      expect(guild.bannerURL()).toBeNull();
    });

    it('builds banner URL when banner is set', () => {
      const guild = createGuild({ banner: 'bannerhash' });
      const url = guild.bannerURL();
      expect(url).toContain('fluxerusercontent.com/banners/guild1/bannerhash.png');
    });
  });

  describe('splashURL()', () => {
    it('returns null when splash is null', () => {
      const guild = createGuild({ splash: null });
      expect(guild.splashURL()).toBeNull();
    });

    it('builds splash URL when splash is set', () => {
      const guild = createGuild({ splash: 'splashhash' });
      const url = guild.splashURL();
      expect(url).toContain('fluxerusercontent.com/splashes/guild1/splashhash.png');
    });
  });

  describe('constructor', () => {
    it('parses guild id and name', () => {
      const guild = createGuild({ id: 'custom123' });
      expect(guild.id).toBe('custom123');
      expect(guild.name).toBe('Test Guild');
    });

    it('preserves the member count when provided', () => {
      const guild = new Guild(createMockClient(), fixtureGuild({ member_count: 42 }));
      expect(guild.memberCount).toBe(42);
    });

    it('uses null when no member count is provided', () => {
      const guild = new Guild(createMockClient(), fixtureGuild());
      expect(guild.memberCount).toBeNull();
    });
  });

  describe('_patch()', () => {
    it('updates the member count only when provided', () => {
      const guild = new Guild(createMockClient(), fixtureGuild({ member_count: 42 }));

      guild._patch(fixtureGuild({ member_count: 43 }));
      expect(guild.memberCount).toBe(43);

      guild._patch(fixtureGuild());
      expect(guild.memberCount).toBe(43);
    });
  });
});
