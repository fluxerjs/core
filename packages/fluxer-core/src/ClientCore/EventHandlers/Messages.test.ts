import { SnowflakeUtil } from '@fluxerjs/util';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Invite } from '../../Domain/Invite.js';
import { Message } from '../../Domain/Message/index.js';
import { PartialMessage } from '../../Domain/Message/PartialMessage.js';
import { Events } from '../../Helpers/Events.js';
import { dispatchForTest, fixtureMessage, fixtureUser } from '../../TestKit/Fixtures.js';
import { Client } from '../Client.js';
import type {
  InviteDeletePayload,
  MessageDeleteBulkPayload,
  MessageReactionPayload,
} from '../EventPayloads.js';

describe('messageHandlers', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ gatewayDeferHandlers: false });
  });

  it('MESSAGE_CREATE caches and emits Message', async () => {
    const emit = vi.spyOn(client, 'emit');
    const data = fixtureMessage({ id: 'm1', channel_id: 'c1', content: 'hi' });

    await dispatchForTest(client, 'MESSAGE_CREATE', data);

    const msg = emit.mock.calls.find((c) => c[0] === Events.MessageCreate)?.[1] as Message;
    expect(msg).toBeInstanceOf(Message);
    expect(msg.content).toBe('hi');
    expect(client._getMessageCache('c1')?.get('m1')).toBeTruthy();
  });

  it('MESSAGE_UPDATE emits old vs new when cached', async () => {
    const original = fixtureMessage({ id: 'm1', channel_id: 'c1', content: 'old' });
    client._addMessageToCache('c1', original);
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'MESSAGE_UPDATE', {
      id: 'm1',
      channel_id: 'c1',
      content: 'new',
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.MessageUpdate);
    expect(call).toBeDefined();
    expect(call![1]).toBeInstanceOf(Message);
    expect((call![1] as Message).content).toBe('old');
    expect((call![2] as Message).content).toBe('new');
    expect((call![2] as Message).partial).toBe(false);
  });

  it('MESSAGE_UPDATE emits PartialMessage when uncached and does not poison cache', async () => {
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'MESSAGE_UPDATE', {
      id: 'm1',
      channel_id: 'c1',
      content: 'new',
    });

    const call = emit.mock.calls.find((c) => c[0] === Events.MessageUpdate);
    expect(call![1]).toBeNull();
    expect(call![2]).toMatchObject({
      partial: true,
      id: 'm1',
      channelId: 'c1',
      content: 'new',
    });
    expect(client._getMessageCache('c1')?.get('m1')).toBeUndefined();
  });

  it('MESSAGE_DELETE emits PartialMessage-shaped payload', async () => {
    const emit = vi.spyOn(client, 'emit');
    const id = '500000000000000001';
    await dispatchForTest(client, 'MESSAGE_DELETE', {
      id,
      channel_id: 'c1',
      guild_id: 'g1',
      content: 'bye',
      author_id: 'u1',
    });

    expect(emit.mock.calls.find((c) => c[0] === Events.MessageDelete)?.[1]).toMatchObject({
      partial: true,
      id,
      channelId: 'c1',
      guildId: 'g1',
      channel: null,
      content: 'bye',
      authorId: 'u1',
      author: null,
      createdAt: SnowflakeUtil.dateFromSnowflake(id),
    });
    expect(emit.mock.calls.find((c) => c[0] === Events.MessageDelete)?.[1]).toBeInstanceOf(
      PartialMessage,
    );
  });

  it('MESSAGE_DELETE hydrates author and createdAt from cache', async () => {
    const cached = fixtureMessage({
      id: 'm1',
      channel_id: 'c1',
      guild_id: 'g1',
      content: 'cached',
      timestamp: '2024-06-01T12:00:00.000Z',
      author: fixtureUser({ id: 'u1', username: 'alice' }),
    });
    client._addMessageToCache('c1', cached);
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, 'MESSAGE_DELETE', {
      id: 'm1',
      channel_id: 'c1',
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.MessageDelete)?.[1] as
      | PartialMessage
      | undefined;
    expect(payload).toMatchObject({
      partial: true,
      id: 'm1',
      channelId: 'c1',
      guildId: 'g1',
      content: 'cached',
      authorId: 'u1',
    });
    expect(payload?.author?.id).toBe('u1');
    expect(payload?.createdAt).toEqual(new Date('2024-06-01T12:00:00.000Z'));
    expect(client._getMessageCache('c1')?.get('m1')).toBeUndefined();
  });

  it('MESSAGE_DELETE resolves author from the user cache', async () => {
    client.getOrCreateUser(fixtureUser({ id: 'u1', username: 'alice' }));
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'MESSAGE_DELETE', {
      id: 'm1',
      channel_id: 'c1',
      author_id: 'u1',
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.MessageDelete)?.[1] as
      | PartialMessage
      | undefined;
    expect(payload?.authorId).toBe('u1');
    expect(payload?.author?.id).toBe('u1');
    expect(payload?.createdAt).toBeNull();
  });

  it('MESSAGE_DELETE_BULK emits camelCase ids payload', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'MESSAGE_DELETE_BULK', {
      ids: ['m1', 'm2'],
      channel_id: 'c1',
      guild_id: null,
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.MessageDeleteBulk)?.[1] as
      | MessageDeleteBulkPayload
      | undefined;
    expect(payload).toEqual({
      ids: ['m1', 'm2'],
      channelId: 'c1',
      guildId: null,
      channel: null,
      messages: [
        expect.objectContaining({ partial: true, id: 'm1', channelId: 'c1' }),
        expect.objectContaining({ partial: true, id: 'm2', channelId: 'c1' }),
      ],
    });
  });

  it('MESSAGE_DELETE_BULK hydrates cached messages before dropping them', async () => {
    client._addMessageToCache(
      'c1',
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        guild_id: 'g1',
        content: 'one',
        author: fixtureUser({ id: 'u1' }),
      }),
    );
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'MESSAGE_DELETE_BULK', {
      ids: ['m1', 'm2'],
      channel_id: 'c1',
      guild_id: 'g1',
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.MessageDeleteBulk)?.[1] as
      | MessageDeleteBulkPayload
      | undefined;
    expect(payload?.messages[0]).toMatchObject({
      partial: true,
      id: 'm1',
      content: 'one',
      authorId: 'u1',
    });
    expect(payload?.messages[1]).toMatchObject({ partial: true, id: 'm2', content: null });
    expect(client._getMessageCache('c1')?.get('m1')).toBeUndefined();
  });

  it('MESSAGE_REACTION_ADD emits MessageReactionPayload', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'MESSAGE_REACTION_ADD', {
      user_id: 'u1',
      channel_id: 'c1',
      message_id: 'm1',
      emoji: { name: '👍', id: null },
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.MessageReactionAdd)?.[1] as
      | MessageReactionPayload
      | undefined;
    expect(payload).toMatchObject({
      messageId: 'm1',
      channelId: 'c1',
      userId: 'u1',
      emoji: { name: '👍' },
    });
    expect(payload?.user.id).toBe('u1');
    expect(payload?.message).toBeNull();
    expect(payload?.channel).toBeNull();
    expect(payload?.member).toBeNull();
  });

  it('MESSAGE_REACTION_ADD hydrates cached message', async () => {
    client._addMessageToCache('c1', fixtureMessage({ id: 'm1', channel_id: 'c1', content: 'hi' }));
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'MESSAGE_REACTION_ADD', {
      user_id: 'u1',
      channel_id: 'c1',
      message_id: 'm1',
      emoji: { name: '👍', id: null },
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.MessageReactionAdd)?.[1] as
      | MessageReactionPayload
      | undefined;
    expect(payload?.message).toBeInstanceOf(Message);
    expect(payload?.message?.content).toBe('hi');
    expect(payload?.reaction.message?.id).toBe('m1');
  });
});

describe('inviteHandlers', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ gatewayDeferHandlers: false });
  });

  it('INVITE_CREATE emits Invite structure', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'INVITE_CREATE', {
      code: 'abc123',
      guild_id: 'g1',
      channel_id: 'c1',
      guild: { id: 'g1', name: 'G', icon: null },
      channel: { id: 'c1', type: 0, name: 'general' },
    });

    const invite = emit.mock.calls.find((c) => c[0] === Events.InviteCreate)?.[1] as Invite;
    expect(invite).toBeInstanceOf(Invite);
    expect(invite.code).toBe('abc123');
  });

  it('INVITE_DELETE emits InviteDeletePayload', async () => {
    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'INVITE_DELETE', {
      code: 'abc123',
      guild_id: 'g1',
      channel_id: 'c1',
    });

    const payload = emit.mock.calls.find((c) => c[0] === Events.InviteDelete)?.[1] as
      | InviteDeletePayload
      | undefined;
    expect(payload).toEqual({ code: 'abc123', guildId: 'g1', channelId: 'c1' });
  });
});
