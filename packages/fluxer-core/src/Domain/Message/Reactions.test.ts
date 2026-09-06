import { describe, expect, it, vi } from 'vitest';
import { Client } from '../../ClientCore/Client.js';
import { ClientUser } from '../../ClientCore/ClientUser.js';
import type { MessageReactionPayload } from '../../ClientCore/EventPayloads.js';
import { Events } from '../../Helpers/Events.js';
import { createTestClient, fixtureMessage, fixtureUser } from '../../TestKit/Fixtures.js';
import { GuildEmoji } from '../Guild/GuildEmoji.js';
import { Message } from './Message.js';

describe('GuildEmoji.identifier', () => {
  it('uses name:id for static and a:name:id for animated', () => {
    const client = new Client();
    const staticEmoji = new GuildEmoji(
      client,
      { id: '111', name: 'wave', animated: false, nsfw: false },
      'guild1',
    );
    const animatedEmoji = new GuildEmoji(
      client,
      { id: '222', name: 'wiggle', animated: true, nsfw: false },
      'guild1',
    );
    expect(staticEmoji.identifier).toBe('wave:111');
    expect(animatedEmoji.identifier).toBe('a:wiggle:222');
    expect(staticEmoji.toString()).toBe('<:wave:111>');
    expect(animatedEmoji.toString()).toBe('<a:wiggle:222>');
  });
});

describe('message.react', () => {
  it('PUTs the reaction and does not synthesize MessageReactionAdd', async () => {
    const client = createTestClient();
    client.user = new ClientUser(client, fixtureUser({ id: 'bot1', username: 'bot', bot: true }));
    vi.spyOn(client.rest, 'put').mockResolvedValue(undefined);

    const message = new Message(
      client,
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        guild_id: 'g1',
        author: fixtureUser({ id: 'bot1', username: 'bot', bot: true }),
      }),
    );

    const seen: MessageReactionPayload[] = [];
    client.on(Events.MessageReactionAdd, (payload) => {
      seen.push(payload);
    });

    await message.react('custom:123456789012345678');

    expect(client.rest.put).toHaveBeenCalled();
    expect(seen).toHaveLength(0);
  });

  it('resolves animated emoji objects for the REST path without a local emit', async () => {
    const client = createTestClient();
    client.user = new ClientUser(client, fixtureUser({ id: 'bot1', username: 'bot', bot: true }));
    vi.spyOn(client, 'resolveEmoji').mockResolvedValue('a:wiggle:999');
    vi.spyOn(client.rest, 'put').mockResolvedValue(undefined);

    const message = new Message(
      client,
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        guild_id: 'g1',
        author: fixtureUser({ id: 'bot1', username: 'bot', bot: true }),
      }),
    );

    const seen: MessageReactionPayload[] = [];
    client.on(Events.MessageReactionAdd, (payload) => {
      seen.push(payload);
    });

    await message.react({ name: 'wiggle', id: '999', animated: true });

    expect(client.resolveEmoji).toHaveBeenCalled();
    expect(client.rest.put).toHaveBeenCalled();
    expect(seen).toHaveLength(0);
  });
});
