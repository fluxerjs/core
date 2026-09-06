import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Client } from '../ClientCore/Client.js';
import type {
  MessageReactionAddManyPayload,
  MessageReactionPayload,
} from '../ClientCore/EventPayloads.js';
import { MessageReaction } from '../Domain/Message/MessageReaction.js';
import type { User } from '../Domain/User.js';
import { createTestClient, fixtureUser } from '../TestKit/Fixtures.js';
import { Events } from './Events.js';
import { ReactionCollector } from './ReactionCollector.js';

function reaction(
  client: Client,
  emoji: { name: string; id?: string; animated?: boolean },
  userId = 'u1',
): MessageReaction {
  return new MessageReaction(client, {
    message_id: 'm1',
    channel_id: 'c1',
    user_id: userId,
    emoji,
  } as never);
}

function addPayload(
  reactionInstance: MessageReaction,
  user: User,
  userId = 'u1',
): MessageReactionPayload {
  return {
    reaction: reactionInstance,
    user,
    message: null,
    channel: null,
    member: null,
    messageId: 'm1',
    channelId: 'c1',
    emoji: reactionInstance.emoji,
    userId,
  };
}

describe('ReactionCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collects MessageReactionAdd events for its message/channel', () => {
    const client = createTestClient();
    const user = client.getOrCreateUser(fixtureUser({ id: 'u1' }));
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 60_000 });
    const seen: string[] = [];
    collector.on('collect', (r) => seen.push(r.emoji.name));

    client.emit(Events.MessageReactionAdd, addPayload(reaction(client, { name: '👍' }), user));

    expect(seen).toEqual(['👍']);
    expect(collector.collected.size).toBe(1);
  });

  it('ignores events for a different message or channel', () => {
    const client = createTestClient();
    const user = client.getOrCreateUser(fixtureUser({ id: 'u1' }));
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 60_000 });

    // Reaction on a different message: collector routes on reaction.messageId.
    const otherMessage = new MessageReaction(client, {
      message_id: 'other',
      channel_id: 'c1',
      user_id: 'u1',
      emoji: { name: '👍' },
    } as never);
    const wrongMessage: MessageReactionPayload = {
      ...addPayload(otherMessage, user),
      messageId: 'other',
    };
    client.emit(Events.MessageReactionAdd, wrongMessage);
    expect(collector.collected.size).toBe(0);
  });

  it('deduplicates the same user + emoji', () => {
    const client = createTestClient();
    const user = client.getOrCreateUser(fixtureUser({ id: 'u1' }));
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 60_000 });
    const collect = vi.fn();
    collector.on('collect', collect);

    client.emit(Events.MessageReactionAdd, addPayload(reaction(client, { name: '👍' }), user));
    client.emit(Events.MessageReactionAdd, addPayload(reaction(client, { name: '👍' }), user));

    expect(collect).toHaveBeenCalledTimes(1);
    expect(collector.collected.size).toBe(1);
  });

  it('keys custom emoji by id so same-name unicode does not collide', () => {
    const client = createTestClient();
    const user = client.getOrCreateUser(fixtureUser({ id: 'u1' }));
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 60_000 });

    client.emit(
      Events.MessageReactionAdd,
      addPayload(reaction(client, { name: 'party', id: '111' }), user),
    );
    client.emit(
      Events.MessageReactionAdd,
      addPayload(reaction(client, { name: 'party', id: '222' }), user),
    );

    expect(collector.collected.size).toBe(2);
  });

  it('applies the filter', () => {
    const client = createTestClient();
    const keep = client.getOrCreateUser(fixtureUser({ id: 'keep' }));
    const drop = client.getOrCreateUser(fixtureUser({ id: 'drop' }));
    const collector = new ReactionCollector(client, 'm1', 'c1', {
      time: 60_000,
      filter: (_r, u) => u.id === 'keep',
    });

    client.emit(
      Events.MessageReactionAdd,
      addPayload(reaction(client, { name: '👍' }, 'drop'), drop, 'drop'),
    );
    client.emit(
      Events.MessageReactionAdd,
      addPayload(reaction(client, { name: '👍' }, 'keep'), keep, 'keep'),
    );

    expect(collector.collected.size).toBe(1);
    expect([...collector.collected.values()][0]?.user.id).toBe('keep');
  });

  it('stops with reason "limit" at max', () => {
    const client = createTestClient();
    const collector = new ReactionCollector(client, 'm1', 'c1', { max: 2 });
    const end = vi.fn();
    collector.on('end', end);

    for (const id of ['u1', 'u2', 'u3']) {
      const user = client.getOrCreateUser(fixtureUser({ id }));
      client.emit(
        Events.MessageReactionAdd,
        addPayload(reaction(client, { name: '👍' }, id), user, id),
      );
    }

    expect(collector.collected.size).toBe(2);
    expect(end.mock.calls[0]?.[1]).toBe('limit');
  });

  it('handles MessageReactionAddMany batches', () => {
    const client = createTestClient();
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 60_000 });

    const payload: MessageReactionAddManyPayload = {
      messageId: 'm1',
      channelId: 'c1',
      guildId: null,
      message: null,
      channel: null,
      reactions: [
        { userId: 'u1', emoji: { name: '👍' }, member: null },
        { userId: 'u2', emoji: { name: '🎉' }, member: null },
      ],
    };
    client.emit(Events.MessageReactionAddMany, payload);

    expect(collector.collected.size).toBe(2);
  });

  it('stops on the time timer and detaches both listeners', () => {
    const client = createTestClient();
    const before = client.listenerCount(Events.MessageReactionAdd);
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 500 });
    const end = vi.fn();
    collector.on('end', end);

    expect(client.listenerCount(Events.MessageReactionAdd)).toBe(before + 1);
    vi.advanceTimersByTime(500);

    expect(end.mock.calls[0]?.[1]).toBe('time');
    expect(client.listenerCount(Events.MessageReactionAdd)).toBe(before);
    expect(client.listenerCount(Events.MessageReactionAddMany)).toBe(0);
  });

  it('stop() is idempotent and defaults to "user"', () => {
    const client = createTestClient();
    const collector = new ReactionCollector(client, 'm1', 'c1', { time: 60_000 });
    const end = vi.fn();
    collector.on('end', end);

    collector.stop();
    collector.stop();

    expect(end).toHaveBeenCalledTimes(1);
    expect(end.mock.calls[0]?.[1]).toBe('user');
  });
});
