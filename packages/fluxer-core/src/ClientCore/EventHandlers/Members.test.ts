import { describe, expect, it, vi } from 'vitest';
import { Guild } from '../../Domain/Guild/Guild.js';
import { dispatchForTest, fixtureGuild, fixtureUser } from '../../TestKit/Fixtures.js';
import { Client } from '../Client.js';

describe('member handlers and guild counts', () => {
  async function dispatch(client: Client, t: string, d: unknown): Promise<void> {
    await dispatchForTest(client, t, d);
  }

  it('increments memberCount on GUILD_MEMBER_ADD when the member is new', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, fixtureGuild({ member_count: 10 }));
    client.guilds.set(guild.id, guild);
    const user = fixtureUser({ id: 'u-new' });

    await dispatch(client, 'GUILD_MEMBER_ADD', {
      guild_id: guild.id,
      user,
      roles: [],
      joined_at: new Date().toISOString(),
      mute: false,
      deaf: false,
    });

    expect(guild.memberCount).toBe(11);
    expect(guild.members.has(user.id)).toBe(true);
  });

  it('does not double-count GUILD_MEMBER_ADD for an already-cached member', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, fixtureGuild({ member_count: 10 }));
    client.guilds.set(guild.id, guild);
    const user = fixtureUser({ id: 'u-cached' });

    await dispatch(client, 'GUILD_MEMBER_ADD', {
      guild_id: guild.id,
      user,
      roles: [],
      joined_at: new Date().toISOString(),
      mute: false,
      deaf: false,
    });
    await dispatch(client, 'GUILD_MEMBER_ADD', {
      guild_id: guild.id,
      user,
      roles: [],
      joined_at: new Date().toISOString(),
      mute: false,
      deaf: false,
    });

    expect(guild.memberCount).toBe(11);
  });

  it('decrements memberCount on GUILD_MEMBER_REMOVE', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, fixtureGuild({ member_count: 10 }));
    client.guilds.set(guild.id, guild);
    const user = fixtureUser({ id: 'u-leave' });

    await dispatch(client, 'GUILD_MEMBER_ADD', {
      guild_id: guild.id,
      user,
      roles: [],
      joined_at: new Date().toISOString(),
      mute: false,
      deaf: false,
    });
    await dispatch(client, 'GUILD_MEMBER_REMOVE', {
      guild_id: guild.id,
      user,
    });

    expect(guild.memberCount).toBe(10);
    expect(guild.members.has(user.id)).toBe(false);
  });

  it('decrements memberCount even when the leaving member was not cached', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, fixtureGuild({ member_count: 10 }));
    client.guilds.set(guild.id, guild);
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_MEMBER_REMOVE', {
      guild_id: guild.id,
      user: fixtureUser({ id: 'u-uncached' }),
    });

    expect(guild.memberCount).toBe(9);
    expect(emit).toHaveBeenCalled();
    const member = emit.mock.calls.find((c) => c[0] === 'guildMemberRemove')?.[1] as {
      partial: boolean;
      id: string;
      user: { id: string };
      guild: { id: string };
    };
    expect(member.partial).toBe(true);
    expect(member.id).toBe('u-uncached');
    expect(member.user.id).toBe('u-uncached');
    expect(member.guild.id).toBe(guild.id);
  });

  it('leaves memberCount null when no baseline exists', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, fixtureGuild());
    client.guilds.set(guild.id, guild);

    await dispatch(client, 'GUILD_MEMBER_ADD', {
      guild_id: guild.id,
      user: fixtureUser({ id: 'u-new' }),
      roles: [],
      joined_at: new Date().toISOString(),
      mute: false,
      deaf: false,
    });

    expect(guild.memberCount).toBeNull();
  });
});
