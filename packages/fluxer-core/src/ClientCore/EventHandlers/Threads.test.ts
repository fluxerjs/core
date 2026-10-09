import { ChannelType, GatewayOpcodes, Routes } from '@fluxerjs/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreadChannel } from '../../Domain/Channel/index.js';
import { Guild } from '../../Domain/Guild/Guild.js';
import { Message } from '../../Domain/Message/Message.js';
import { Events } from '../../Helpers/Events.js';
import {
  createTestClient,
  dispatchForTest,
  fixtureGuild,
  fixtureMember,
  fixtureMessage,
  fixtureUser,
} from '../../TestKit/Fixtures.js';
import type { Client } from '../Client.js';
import type { ForumUnreadsPayload, ThreadMemberListUpdatePayload } from '../EventPayloads.js';
import { hydrateReadyGuilds } from '../GatewayReady.js';

function threadPayload(id = 't1') {
  return {
    id,
    type: ChannelType.PublicThread,
    guild_id: 'g1',
    parent_id: 'c1',
    name: 'topic',
    thread_metadata: {
      archived: false,
      auto_archive_duration: 1440,
      archive_timestamp: '2024-01-01T00:00:00.000Z',
      create_timestamp: '2024-01-01T00:00:00.000Z',
      locked: false,
    },
  };
}

describe('thread gateway events', () => {
  let client: Client;

  beforeEach(() => {
    client = createTestClient();
    const guild = new Guild(client, fixtureGuild({ id: 'g1' }));
    client.guilds.set(guild.id, guild);
  });

  it('THREAD_CREATE caches the thread and emits threadCreate', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'THREAD_CREATE', threadPayload());

    const thread = client.channels.get('t1');
    expect(thread).toBeInstanceOf(ThreadChannel);
    expect(client.guilds.get('g1')?.channels.get('t1')).toBe(thread);
    expect(emit.mock.calls.find((call) => call[0] === Events.ThreadCreate)?.[1]).toBe(thread);
  });

  it('CHANNEL_CREATE of a thread also emits threadCreate', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'CHANNEL_CREATE', threadPayload('t2'));

    const thread = client.channels.get('t2');
    expect(thread?.isThread()).toBe(true);
    expect(
      emit.mock.calls.some((call) => call[0] === Events.ThreadCreate && call[1] === thread),
    ).toBe(true);
  });

  it('THREAD_LIST_SYNC caches active threads', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'THREAD_LIST_SYNC', {
      guild_id: 'g1',
      channel_ids: ['c1'],
      threads: [threadPayload('t3')],
      members: [],
    });

    expect(client.channels.get('t3')).toBeInstanceOf(ThreadChannel);
    const payload = emit.mock.calls.find((call) => call[0] === Events.ThreadListSync)?.[1] as {
      guildId: string;
      channelIds: string[];
      threads: ThreadChannel[];
    };
    expect(payload.guildId).toBe('g1');
    expect(payload.channelIds).toEqual(['c1']);
    expect(payload.threads).toHaveLength(1);
    expect(emit.mock.calls.some((call) => call[0] === Events.ChannelCreate)).toBe(false);
  });

  it('THREAD_DELETE emits a thread that was not cached', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'THREAD_DELETE', {
      id: 't-gone',
      guild_id: 'g1',
      parent_id: 'c1',
      type: ChannelType.PublicThread,
    });

    expect(client.channels.get('t-gone')).toBeUndefined();
    const thread = emit.mock.calls.find(
      (call) => call[0] === Events.ThreadDelete,
    )?.[1] as ThreadChannel;
    expect(thread).toBeInstanceOf(ThreadChannel);
    expect(thread.id).toBe('t-gone');
    expect(thread.parentId).toBe('c1');
    expect(
      emit.mock.calls.some((call) => call[0] === Events.ChannelDelete && call[1] === thread),
    ).toBe(true);
  });

  it('THREAD_DELETE removes a cached thread', async () => {
    await dispatchForTest(client, 'THREAD_CREATE', threadPayload('t-cached'));
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'THREAD_DELETE', {
      id: 't-cached',
      guild_id: 'g1',
      parent_id: 'c1',
      type: ChannelType.PublicThread,
    });

    expect(client.channels.get('t-cached')).toBeUndefined();
    expect(client.guilds.get('g1')?.channels.get('t-cached')).toBeUndefined();
    expect(emit.mock.calls.some((call) => call[0] === Events.ThreadDelete)).toBe(true);
  });

  it('THREAD_MEMBER_LIST_UPDATE caches the guild member and emits the list', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'THREAD_MEMBER_LIST_UPDATE', {
      guild_id: 'g1',
      thread_id: 't1',
      members: [
        {
          user_id: 'u1',
          join_timestamp: '2024-01-01T00:00:00.000Z',
          flags: 2,
          member: fixtureMember({ user: fixtureUser({ id: 'u1', username: 'ada' }) }),
          presence: { status: 'online' },
        },
      ],
    });

    expect(client.guilds.get('g1')?.members.get('u1')?.user.username).toBe('ada');
    const payload = emit.mock.calls.find(
      (call) => call[0] === Events.ThreadMemberListUpdate,
    )?.[1] as ThreadMemberListUpdatePayload;
    expect(payload.threadId).toBe('t1');
    expect(payload.members[0]).toMatchObject({
      userId: 'u1',
      flags: 2,
      presence: { status: 'online' },
    });
    expect(payload.members[0]?.member?.id).toBe('u1');
  });

  it('FORUM_UNREADS emits unread counts', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'FORUM_UNREADS', {
      guild_id: 'g1',
      channel_id: 'forum1',
      threads: [
        { thread_id: 't1', count: 3 },
        { thread_id: 't2', missing: true },
      ],
    });

    const payload = emit.mock.calls.find(
      (call) => call[0] === Events.ForumUnreads,
    )?.[1] as ForumUnreadsPayload;
    expect(payload).toEqual({
      guildId: 'g1',
      channelId: 'forum1',
      threads: [
        { threadId: 't1', count: 3, missing: false },
        { threadId: 't2', count: null, missing: true },
      ],
    });
  });

  it('GUILD_CREATE and GUILD_SYNC cache the threads array and drop threads the snapshot omits', async () => {
    await dispatchForTest(client, 'THREAD_CREATE', threadPayload('stale'));

    await dispatchForTest(client, 'GUILD_CREATE', {
      ...fixtureGuild({ id: 'g1' }),
      channels: [{ id: 'c1', type: ChannelType.GuildText, name: 'general', guild_id: 'g1' }],
      threads: [threadPayload('active')],
    });

    expect(client.channels.get('active')).toBeInstanceOf(ThreadChannel);
    expect(client.channels.get('stale')).toBeUndefined();
    expect(client.guilds.get('g1')?.channels.get('c1')?.isText()).toBe(true);

    await dispatchForTest(client, 'GUILD_SYNC', {
      ...fixtureGuild({ id: 'g1', name: 'Synced' }),
      channels: [{ id: 'c1', type: ChannelType.GuildText, name: 'general', guild_id: 'g1' }],
      threads: [threadPayload('synced')],
    });

    expect(client.guilds.get('g1')?.name).toBe('Synced');
    expect(client.channels.get('synced')).toBeInstanceOf(ThreadChannel);
    expect(client.channels.get('active')).toBeUndefined();
  });

  it('READY caches threads on an available guild', () => {
    hydrateReadyGuilds(
      client,
      [
        {
          ...fixtureGuild({ id: 'g1' }),
          channels: [{ id: 'c1', type: ChannelType.GuildText, name: 'general', guild_id: 'g1' }],
          threads: [threadPayload('from-ready')],
        },
      ],
      false,
    );

    expect(client.channels.get('from-ready')).toBeInstanceOf(ThreadChannel);
    expect(client.guilds.get('g1')?.channels.get('from-ready')).toBe(
      client.channels.get('from-ready'),
    );
  });
});

describe('thread gateway requests', () => {
  it('requestForumUnreads and subscribeThreads send the thread opcodes', () => {
    const client = createTestClient();
    const send = vi.fn();
    client._ws = { getShardCount: () => 1, send } as never;

    client.requestForumUnreads({
      guildId: 'g1',
      channelId: 'forum1',
      threads: [{ threadId: 't1', ackMessageId: 'm1' }, { threadId: 't1' }],
    });
    client.subscribeThreads({ guildId: 'g1', threads: true, threadIds: ['t1', 't1'] });

    expect(send).toHaveBeenNthCalledWith(1, 0, {
      op: GatewayOpcodes.RequestForumUnreads,
      d: {
        guild_id: 'g1',
        channel_id: 'forum1',
        threads: [{ thread_id: 't1', ack_message_id: 'm1' }],
      },
    });
    expect(send).toHaveBeenNthCalledWith(2, 0, {
      op: GatewayOpcodes.LazyRequest,
      d: { subscriptions: { g1: { threads: true, thread_member_lists: ['t1'] } } },
    });
  });
});

describe('Message.startThread', () => {
  it('posts to the message thread route and caches the thread', async () => {
    const client = createTestClient();
    const message = new Message(
      client,
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        author: fixtureUser(),
      }),
    );
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue(threadPayload('t4'));

    const thread = await message.startThread({ name: 'from message' });

    expect(post).toHaveBeenCalledWith(Routes.channelMessageThreads('c1', 'm1'), {
      body: { name: 'from message' },
      auth: true,
    });
    expect(thread).toBeInstanceOf(ThreadChannel);
    expect(client.channels.get('t4')).toBe(thread);
  });
});
