import { describe, it, expect } from 'vitest';
import { Guild, Client, User, GuildMember } from '../';

function createMockClient() {
  const client = {
    getOrCreateUser: (data: { id: string; username: string; discriminator: string; global_name?: string | null }) =>
      new User(client as Client, data),
  }
  return client as Client;
}

function createMockGuild(client: ReturnType<typeof createMockClient>) {
  return new Guild(client as never, {
    id: 'guild123',
    name: 'Test Guild',
    icon: null,
    banner: null,
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

function createMember(
  overrides: {
    nick?: string | null;
    user?: { username?: string; global_name?: string | null };
  } = {},
) {
  const client = createMockClient();
  const guild = createMockGuild(client);
  return new GuildMember(
    client as never,
    {
      user: {
        id: 'user1',
        username: overrides.user?.username ?? 'TestUser',
        discriminator: '0',
        global_name: overrides.user?.global_name ?? null,
      },
      nick: overrides.nick ?? null,
      roles: [],
      joined_at: new Date().toISOString(),
    },
    guild,
  );
}

describe('GuildMember', () => {
  describe('displayName', () => {
    it('returns nickname when set', () => {
      const member = createMember({ nick: 'ServerNick' });
      expect(member.displayName).toBe('ServerNick');
    });

    it('returns global name when no nick', () => {
      const member = createMember({
        nick: null,
        user: { username: 'alice', global_name: 'Alice Display' },
      });
      expect(member.displayName).toBe('Alice Display');
    });

    it('returns username when no nick or global name', () => {
      const member = createMember({
        nick: null,
        user: { username: 'bob', global_name: null },
      });
      expect(member.displayName).toBe('bob');
    });
  });

  describe('avatarURL()', () => {
    it('returns null when member has no guild avatar', () => {
      const member = createMember();
      expect(member.avatar).toBeNull();
      expect(member.avatarURL()).toBeNull();
    });

    it('builds member avatar URL when avatar is set', () => {
      const client = createMockClient();
      const guild = createMockGuild(client);
      const member = new GuildMember(
        client as never,
        {
          user: { id: 'u1', username: 'Test', discriminator: '0' },
          nick: null,
          avatar: 'memberavatar',
          roles: [],
          joined_at: new Date().toISOString(),
        },
        guild,
      );
      const url = member.avatarURL();
      expect(url).toContain('guilds/guild123/users/u1/avatars/memberavatar');
    });
  });

  describe('displayAvatarURL()', () => {
    it('falls back to user avatar when no guild avatar', () => {
      const client = createMockClient();
      const guild = createMockGuild(client);
      const member = new GuildMember(
        client as never,
        {
          user: {
            id: 'u1',
            username: 'Test',
            discriminator: '0',
            avatar: 'useravatar',
          },
          nick: null,
          avatar: null,
          roles: [],
          joined_at: new Date().toISOString(),
        },
        guild,
      );
      const url = member.displayAvatarURL();
      expect(url).toContain('avatars/u1/useravatar');
    });
  });
});
