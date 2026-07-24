import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '../Client.js';
import { Events } from '../../util/Events.js';
import { Guild } from '../../structures/Guild.js';
import { GuildMember } from '../../structures/GuildMember.js';
import type { MessageReactionRemoveAllPayload } from '../eventPayloads.js';

function sampleGuild(client: Client, id = 'g1'): Guild {
  return new Guild(client, {
    id,
    name: 'Test Guild',
    icon: null,
    banner: null,
    splash: null,
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

describe('eventNormalize', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ intents: 0, gatewayDeferHandlers: false });
  });

  it('emits MessageReactionRemoveAll with camelCase payload', async () => {
    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (payload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'MESSAGE_REACTION_REMOVE_ALL',
      d: {
        channel_id: 'c1',
        message_id: 'm1',
        guild_id: 'g1',
      },
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.MessageReactionRemoveAll);
    expect(call).toBeTruthy();
    const payload = call?.[1] as MessageReactionRemoveAllPayload;
    expect(payload).toEqual({
      messageId: 'm1',
      channelId: 'c1',
      guildId: 'g1',
    });
  });

  it('does not replace a cached user with reaction placeholder data', async () => {
    const user = client.getOrCreateUser({
      id: 'u1',
      username: 'alice',
      discriminator: '0',
      global_name: 'Alice',
      avatar: 'avatar',
    });

    await (
      client as unknown as { handleDispatch: (payload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'MESSAGE_REACTION_ADD',
      d: {
        channel_id: 'c1',
        message_id: 'm1',
        user_id: 'u1',
        emoji: { name: '✅' },
      },
    });

    expect(user).toMatchObject({ username: 'alice', globalName: 'Alice', avatar: 'avatar' });
  });

  it('GuildMemberUpdate emits distinct old vs new after nick change', async () => {
    const guild = sampleGuild(client);
    client.guilds.set(guild.id, guild);

    const member = new GuildMember(
      client,
      {
        user: { id: 'u1', username: 'alice', discriminator: '0' },
        roles: [],
        joined_at: '2024-01-01T00:00:00.000Z',
        nick: 'OldNick',
      },
      guild,
    );
    guild.members.set(member.id, member);

    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (payload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'GUILD_MEMBER_UPDATE',
      d: {
        guild_id: 'g1',
        user: { id: 'u1', username: 'alice', discriminator: '0' },
        roles: [],
        joined_at: '2024-01-01T00:00:00.000Z',
        nick: 'NewNick',
      },
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
});
