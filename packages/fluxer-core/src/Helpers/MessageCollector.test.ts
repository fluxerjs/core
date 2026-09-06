import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../Domain/Message/index.js';
import { createTestClient } from '../TestKit/Fixtures.js';
import { Events } from './Events.js';
import { MessageCollector } from './MessageCollector.js';

/** Minimal Message-shaped stub sufficient for collector routing/filtering. */
function stubMessage(id: string, channelId: string, authorId = 'a'): Message {
  return { id, channelId, author: { id: authorId } } as unknown as Message;
}

describe('MessageCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collects messages on its channel and emits collect', () => {
    const client = createTestClient();
    const collector = new MessageCollector(client, 'c1', { time: 60_000 });
    const collected: string[] = [];
    collector.on('collect', (m) => collected.push(m.id));

    client.emit(Events.MessageCreate, stubMessage('m1', 'c1'));
    client.emit(Events.MessageCreate, stubMessage('m2', 'c1'));

    expect(collected).toEqual(['m1', 'm2']);
    expect(collector.collected.size).toBe(2);
  });

  it('ignores messages from other channels', () => {
    const client = createTestClient();
    const collector = new MessageCollector(client, 'c1', { time: 60_000 });
    client.emit(Events.MessageCreate, stubMessage('m1', 'other'));
    expect(collector.collected.size).toBe(0);
  });

  it('applies the filter', () => {
    const client = createTestClient();
    const collector = new MessageCollector(client, 'c1', {
      time: 60_000,
      filter: (m) => m.author.id === 'keep',
    });
    client.emit(Events.MessageCreate, stubMessage('m1', 'c1', 'drop'));
    client.emit(Events.MessageCreate, stubMessage('m2', 'c1', 'keep'));
    expect([...collector.collected.keys()]).toEqual(['m2']);
  });

  it('throws when neither time nor max is set', () => {
    const client = createTestClient();
    expect(() => new MessageCollector(client, 'c1')).toThrow(/time.*max|max.*time/i);
  });

  it('stops with reason "limit" once max is reached', () => {
    const client = createTestClient();
    const collector = new MessageCollector(client, 'c1', { max: 2 });
    const end = vi.fn();
    collector.on('end', end);

    client.emit(Events.MessageCreate, stubMessage('m1', 'c1'));
    client.emit(Events.MessageCreate, stubMessage('m2', 'c1'));
    // Past the limit: collector has stopped and no longer collects.
    client.emit(Events.MessageCreate, stubMessage('m3', 'c1'));

    expect(collector.collected.size).toBe(2);
    expect(end).toHaveBeenCalledTimes(1);
    expect(end.mock.calls[0]?.[1]).toBe('limit');
  });

  it('stops with reason "time" when the timer fires', () => {
    const client = createTestClient();
    const collector = new MessageCollector(client, 'c1', { time: 1000 });
    const end = vi.fn();
    collector.on('end', end);

    vi.advanceTimersByTime(1000);

    expect(end).toHaveBeenCalledTimes(1);
    expect(end.mock.calls[0]?.[1]).toBe('time');
    // Detached from the client after ending.
    client.emit(Events.MessageCreate, stubMessage('m1', 'c1'));
    expect(collector.collected.size).toBe(0);
  });

  it('stop() defaults to reason "user" and is idempotent', () => {
    const client = createTestClient();
    const collector = new MessageCollector(client, 'c1', { time: 60_000 });
    const end = vi.fn();
    collector.on('end', end);

    collector.stop();
    collector.stop();

    expect(end).toHaveBeenCalledTimes(1);
    expect(end.mock.calls[0]?.[1]).toBe('user');
  });

  it('awaitMessages resolves collected messages when max is not an error', async () => {
    const client = createTestClient();
    const pending = MessageCollector.awaitMessages(client, 'c1', {
      max: 1,
      errors: [],
    });
    client.emit(Events.MessageCreate, stubMessage('m1', 'c1'));
    const collected = await pending;
    expect([...collected.keys()]).toEqual(['m1']);
  });

  it('awaitMessages rejects with CollectorMax by default when max is reached', async () => {
    const client = createTestClient();
    const pending = MessageCollector.awaitMessages(client, 'c1', { max: 1 });
    client.emit(Events.MessageCreate, stubMessage('m1', 'c1'));
    await expect(pending).rejects.toMatchObject({ code: 'COLLECTOR_MAX' });
  });

  it('removes its client listener on stop', () => {
    const client = createTestClient();
    const before = client.listenerCount(Events.MessageCreate);
    const collector = new MessageCollector(client, 'c1', { time: 60_000 });
    expect(client.listenerCount(Events.MessageCreate)).toBe(before + 1);
    collector.stop();
    expect(client.listenerCount(Events.MessageCreate)).toBe(before);
  });
});
