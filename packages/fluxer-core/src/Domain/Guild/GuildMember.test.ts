import { describe, expect, it, vi } from 'vitest';
import { Client } from '../../ClientCore/Client.js';
import { fixtureGuild, fixtureMember, fixtureUser } from '../../TestKit/Fixtures.js';
import { Guild } from './Guild.js';
import { GuildMember } from './GuildMember.js';

function createMockClient() {
  return new Client({ gatewayDeferHandlers: false });
}

function createMockGuild(client: ReturnType<typeof createMockClient>) {
  return new Guild(
    client,
    fixtureGuild({
      id: 'guild123',
      name: 'Test Guild',
      owner_id: 'owner1',
      afk_timeout: 0,
    }),
  );
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
    fixtureMember({
      user: fixtureUser({
        id: 'user1',
        username: overrides.user?.username ?? 'TestUser',
        global_name: overrides.user?.global_name ?? null,
      }),
      nick: overrides.nick ?? null,
    }),
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
        fixtureMember({
          user: fixtureUser({ id: 'u1', username: 'Test' }),
          nick: null,
          avatar: 'memberavatar',
        }),
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
        fixtureMember({
          user: fixtureUser({
            id: 'u1',
            username: 'Test',
            avatar: 'useravatar',
          }),
          nick: null,
          avatar: null,
        }),
        guild,
      );
      const url = member.displayAvatarURL();
      expect(url).toContain('avatars/u1/useravatar');
    });
  });

  describe('move()', () => {
    it('calls edit with channelId to move member', async () => {
      const member = createMember();
      let editCalled: boolean = false;
      let editParams: { channelId: string | null; connectionId?: string | null } | undefined;

      member.edit = async (params: { channelId: string | null; connectionId?: string | null }) => {
        editCalled = true;
        editParams = params;
        return member;
      };

      await member.move('voicechannel123');

      expect(editCalled).toBe(true);
      expect(editParams).toEqual({
        channelId: 'voicechannel123',
        connectionId: undefined,
      });
    });

    it('calls edit with null to disconnect member', async () => {
      const member = createMember();
      let editCalled: boolean = false;
      let editParams: { channelId: string | null; connectionId?: string | null } | undefined;

      member.edit = async (params: { channelId: string | null; connectionId?: string | null }) => {
        editCalled = true;
        editParams = params;
        return member;
      };

      await member.move(null);

      expect(editCalled).toBe(true);
      expect(editParams).toEqual({
        channelId: null,
        connectionId: undefined,
      });
    });

    it('calls edit with connectionId when provided', async () => {
      const member = createMember();
      let editCalled: boolean = false;
      let editParams: { channelId: string | null; connectionId?: string | null } | undefined;

      member.edit = async (params: { channelId: string | null; connectionId?: string | null }) => {
        editCalled = true;
        editParams = params;
        return member;
      };

      await member.move('voicechannel123', 'connection456');

      expect(editCalled).toBe(true);
      expect(editParams).toEqual({
        channelId: 'voicechannel123',
        connectionId: 'connection456',
      });
    });
  });

  describe('kick / ban / timeout', () => {
    it('kick delegates to guild.kick', async () => {
      const member = createMember();
      const kick = vi.spyOn(member.guild, 'kick').mockResolvedValue(undefined);
      await member.kick();
      expect(kick).toHaveBeenCalledWith(member.id);
    });

    it('ban delegates to guild.ban', async () => {
      const member = createMember();
      const ban = vi.spyOn(member.guild, 'ban').mockResolvedValue(undefined);
      await member.ban({ reason: 'spam' });
      expect(ban).toHaveBeenCalledWith(member.id, { reason: 'spam' });
    });

    it('timeout(null) clears communicationDisabledUntil', async () => {
      const member = createMember();
      let editParams:
        | { communicationDisabledUntil?: string | null; timeoutReason?: string | null }
        | undefined;
      member.edit = async (params) => {
        editParams = params;
        return member;
      };
      await member.timeout(null);
      expect(editParams).toEqual({ communicationDisabledUntil: null });
    });

    it('timeout(ms) sets a future ISO timestamp', async () => {
      const member = createMember();
      let editParams:
        | { communicationDisabledUntil?: string | null; timeoutReason?: string | null }
        | undefined;
      member.edit = async (params) => {
        editParams = params;
        return member;
      };
      await member.timeout(60_000, 'cool down');
      expect(editParams?.timeoutReason).toBe('cool down');
      expect(editParams?.communicationDisabledUntil).toEqual(expect.any(String));
    });
  });
});
