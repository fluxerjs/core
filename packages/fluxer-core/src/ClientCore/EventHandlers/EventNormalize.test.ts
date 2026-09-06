import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Guild } from '../../Domain/Guild/Guild.js';
import { GuildMember } from '../../Domain/Guild/GuildMember.js';
import { Events } from '../../Helpers/Events.js';
import {
  dispatchForTest,
  fixtureGuild,
  fixtureMember,
  fixtureUser,
} from '../../TestKit/Fixtures.js';
import { Client } from '../Client.js';
import type { MessageReactionRemoveAllPayload } from '../EventPayloads.js';

function sampleGuild(client: Client, id = 'g1'): Guild {
  return new Guild(client, fixtureGuild({ id, name: 'Test Guild', owner_id: 'owner1' }));
}

describe('eventNormalize', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ gatewayDeferHandlers: false });
  });

  it('emits MessageReactionRemoveAll with camelCase payload', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'MESSAGE_REACTION_REMOVE_ALL', {
      channel_id: 'c1',
      message_id: 'm1',
      guild_id: 'g1',
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.MessageReactionRemoveAll);
    expect(call).toBeTruthy();
    const payload = call?.[1] as MessageReactionRemoveAllPayload;
    expect(payload).toEqual({
      messageId: 'm1',
      channelId: 'c1',
      guildId: 'g1',
      message: null,
      channel: null,
    });
  });

  it('emits GuildMemberAdd with cached member', async () => {
    const guild = sampleGuild(client);
    client.guilds.set(guild.id, guild);
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'GUILD_MEMBER_ADD', {
      guild_id: 'g1',
      ...fixtureMember({
        user: fixtureUser({
          id: 'u1',
          username: 'alice',
          global_name: 'Alice',
          avatar: 'avatar',
        }),
      }),
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.GuildMemberAdd);
    expect(call).toBeTruthy();
    const member = call?.[1] as GuildMember;
    expect(member).toBeInstanceOf(GuildMember);
    expect(member.user).toMatchObject({ username: 'alice', globalName: 'Alice', avatar: 'avatar' });
  });

  it('GuildMemberUpdate emits distinct old vs new after nick change', async () => {
    const guild = sampleGuild(client);
    client.guilds.set(guild.id, guild);

    const member = new GuildMember(
      client,
      fixtureMember({
        user: fixtureUser({ id: 'u1', username: 'alice' }),
        nick: 'OldNick',
      }),
      guild,
    );
    guild.members.set(member.id, member);

    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'GUILD_MEMBER_UPDATE', {
      guild_id: 'g1',
      user: fixtureUser({ id: 'u1', username: 'alice' }),
      roles: [],
      joined_at: '2024-01-01T00:00:00.000Z',
      nick: 'NewNick',
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.GuildMemberUpdate);
    expect(call).toBeTruthy();
    const oldM = call?.[1] as GuildMember;
    const newM = call?.[2] as GuildMember;
    expect(oldM).not.toBe(newM);
    expect(oldM.nick).toBe('OldNick');
    expect(newM.nick).toBe('NewNick');
    expect(guild.members.get('u1')).toBe(newM);
  });

  it('emits debug for unhandled gateway dispatches', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'USER_SETTINGS_UPDATE', {});
    const call = emit.mock.calls.find((c) => c[0] === Events.Debug);
    expect(String(call?.[1])).toContain('Unhandled dispatch: USER_SETTINGS_UPDATE');
  });

  it('emits ChannelRecipientAdd with camelCase payload', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'CHANNEL_RECIPIENT_ADD', {
      channel_id: 'c1',
      user: fixtureUser({ id: 'u9', username: 'newbie' }),
    });
    const call = emit.mock.calls.find((c) => c[0] === Events.ChannelRecipientAdd);
    expect(call).toBeTruthy();
    const payload = call?.[1] as { channelId: string; user: { id: string } } | undefined;
    expect(payload).toMatchObject({ channelId: 'c1' });
    expect(payload?.user.id).toBe('u9');
  });
});
