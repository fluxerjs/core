import type { APIMessage } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { Guild } from '../Domain/Guild/Guild.js';
import { Role } from '../Domain/Guild/Role.js';
import { upsertGuildFromSnapshot } from '../Domain/Guild/Snapshot.js';
import { fixtureGuild, fixtureMember, fixtureMessage, fixtureUser } from '../TestKit/Fixtures.js';
import { Client } from './Client.js';
import { guildHandlers } from './EventHandlers/Guilds.js';
import { messageHandlers } from './EventHandlers/Messages.js';
import { hydrateReadyGuilds } from './GatewayReady.js';

function guildData(id: string, name = id) {
  return fixtureGuild({ id, name });
}

function channelData(id: string, guildId: string) {
  return { id, guild_id: guildId, type: 0 as const, name: id };
}

function roleData(id: string) {
  return {
    id,
    name: id,
    color: 0,
    position: 0,
    permissions: '0',
    hoist: false,
    mentionable: false,
  };
}

function memberData(id: string) {
  return fixtureMember({ user: fixtureUser({ id, username: id }) });
}

function messageData(id: string, channelId: string): APIMessage {
  return fixtureMessage({
    id,
    channel_id: channelId,
    author: fixtureUser({ id: 'author1', username: 'author' }),
    content: id,
    timestamp: new Date(0).toISOString(),
  });
}

describe('cache system', () => {
  it('FIFO-evicts guilds/channels/users at configured limits', () => {
    const client = new Client({
      gatewayDeferHandlers: false,
      cache: { guilds: 1, channels: 1, users: 1 },
    });

    const g1 = new Guild(client, guildData('g1'));
    const g2 = new Guild(client, guildData('g2'));
    client.guilds.set('g1', g1);
    client.guilds.set('g2', g2);
    expect([...client.guilds.keys()]).toEqual(['g2']);

    client.users.set('u1', { id: 'u1' } as never);
    client.users.set('u2', { id: 'u2' } as never);
    expect([...client.users.keys()]).toEqual(['u2']);

    client.channels.set('c1', { id: 'c1' } as never);
    client.channels.set('c2', { id: 'c2' } as never);
    expect([...client.channels.keys()]).toEqual(['c2']);
  });

  it('guild delete cascades channels and message caches; dual indexes stay aligned', async () => {
    const client = new Client({ gatewayDeferHandlers: false, cache: { messages: 10 } });
    await guildHandlers.GUILD_CREATE!(client, {
      ...guildData('g1', 'Cascade'),
      channels: [channelData('c1', 'g1'), channelData('c2', 'g1')],
    });
    client._addMessageToCache('c1', messageData('m1', 'c1'));
    client._addMessageToCache('c2', messageData('m2', 'c2'));

    expect(client.channels.size).toBe(2);
    await guildHandlers.GUILD_DELETE!(client, { id: 'g1' });

    expect(client.guilds.has('g1')).toBe(false);
    expect(client.channels.has('c1')).toBe(false);
    expect(client.channels.has('c2')).toBe(false);
    expect(client._getMessageCache('c1')).toBeNull();
    expect(client._getMessageCache('c2')).toBeNull();
  });

  it('guild FIFO eviction cascades nested channel caches', () => {
    const client = new Client({
      gatewayDeferHandlers: false,
      cache: { guilds: 1, messages: 10 },
    });
    const g1 = new Guild(client, guildData('g1'));
    client.guilds.set(g1.id, g1);
    const ch = { id: 'c1', guildId: 'g1', type: 0 } as never;
    client.channels.set('c1', ch);
    g1.channels.set('c1', ch);
    client._addMessageToCache('c1', messageData('m1', 'c1'));

    const g2 = new Guild(client, guildData('g2'));
    client.guilds.set(g2.id, g2);

    expect(client.guilds.has('g1')).toBe(false);
    expect(client.channels.has('c1')).toBe(false);
    expect(client._getMessageCache('c1')).toBeNull();
  });

  it('messages: false disables; messages: 0 is unbounded', () => {
    const warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

    const off = new Client({ gatewayDeferHandlers: false, cache: { messages: false } });
    off._addMessageToCache('c1', messageData('m1', 'c1'));
    expect(off._getMessageCache('c1')).toBeNull();
    expect(off.cache.limits.messages).toBe(false);

    const unbounded = new Client({ gatewayDeferHandlers: false, cache: { messages: 0 } });
    expect(unbounded.cache.limits.messages).toBe(Number.POSITIVE_INFINITY);
    for (let i = 0; i < 60; i++) {
      unbounded._addMessageToCache('c1', messageData(`m${i}`, 'c1'));
    }
    expect(unbounded._getMessageCache('c1')?.size).toBe(60);
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it('repeated READY / GUILD_CREATE preserve Guild/Channel/Role identity', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const snapshot = {
      ...guildData('g1', 'Identity'),
      roles: [roleData('r1')],
      channels: [channelData('c1', 'g1')],
      members: [memberData('u1')],
    };

    hydrateReadyGuilds(client, [snapshot], false);
    const guild = client.guilds.get('g1')!;
    const channel = guild.channels.get('c1')!;
    const role = guild.roles.get('r1')!;

    hydrateReadyGuilds(
      client,
      [
        {
          ...guildData('g1', 'Identity 2'),
          roles: [roleData('r1')],
          channels: [channelData('c1', 'g1')],
        },
      ],
      false,
    );
    expect(client.guilds.get('g1')).toBe(guild);
    expect(guild.channels.get('c1')).toBe(channel);
    expect(guild.roles.get('r1')).toBe(role);
    expect(guild.name).toBe('Identity 2');

    await guildHandlers.GUILD_CREATE!(client, {
      ...guildData('g1', 'Identity 3'),
      roles: [roleData('r1')],
      channels: [channelData('c1', 'g1')],
    });
    expect(client.guilds.get('g1')).toBe(guild);
    expect(guild.channels.get('c1')).toBe(channel);
    expect(guild.roles.get('r1')).toBe(role);
    expect(guild.name).toBe('Identity 3');
  });

  it('only indexes channels that belong to the snapshot guild', () => {
    const client = new Client({ gatewayDeferHandlers: false });
    hydrateReadyGuilds(
      client,
      [
        {
          ...guildData('g1', 'Ownership'),
          channels: [
            { id: 'implied', type: 0, name: 'implied' } as never,
            channelData('foreign', 'g2'),
            { id: 'dm', type: 1, name: 'dm' } as never,
          ],
        },
      ],
      false,
    );

    const guild = client.guilds.get('g1')!;
    expect(guild.channels.get('implied')?.guildId).toBe('g1');
    expect(client.channels.get('implied')).toBe(guild.channels.get('implied'));
    expect(client.channels.has('foreign')).toBe(false);
    expect(client.channels.has('dm')).toBe(false);
  });

  it('recovery reuses Guild, prunes absent channels, merges members', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    await guildHandlers.GUILD_CREATE!(client, {
      ...guildData('g1', 'Before'),
      roles: [roleData('old-role')],
      channels: [channelData('old-channel', 'g1'), channelData('keep-channel', 'g1')],
      members: [memberData('old-member')],
    });
    const guild = client.guilds.get('g1')!;
    const keep = guild.channels.get('keep-channel')!;

    await guildHandlers.GUILD_DELETE!(client, { id: 'g1', unavailable: true });
    await guildHandlers.GUILD_CREATE!(client, {
      ...guildData('g1', 'After'),
      roles: [roleData('new-role')],
      channels: [channelData('keep-channel', 'g1'), channelData('new-channel', 'g1')],
      members: [memberData('new-member')],
    });

    expect(client.guilds.get('g1')).toBe(guild);
    expect(guild.available).toBe(true);
    expect(guild.channels.get('keep-channel')).toBe(keep);
    expect(guild.channels.has('old-channel')).toBe(false);
    expect(client.channels.has('old-channel')).toBe(false);
    expect(guild.channels.has('new-channel')).toBe(true);
    expect(guild.roles.has('old-role')).toBe(false);
    expect(guild.roles.has('new-role')).toBe(true);
    expect(guild.members.has('old-member')).toBe(true);
    expect(guild.members.has('new-member')).toBe(true);
  });

  it('MESSAGE_UPDATE routes through FIFO add()', () => {
    const client = new Client({ gatewayDeferHandlers: false, cache: { messages: 2 } });
    client._addMessageToCache('c1', messageData('m1', 'c1'));
    client._addMessageToCache('c1', messageData('m2', 'c1'));

    messageHandlers.MESSAGE_UPDATE!(client, {
      ...messageData('m3', 'c1'),
      content: 'updated-new',
    });

    const cache = client._getMessageCache('c1')!;
    expect(cache.has('m1')).toBe(false);
    expect(cache.has('m2')).toBe(true);
    expect(cache.get('m3')?.content).toBe('updated-new');
  });

  it('sweeps and cache.stats() report bucket sizes', async () => {
    const client = new Client({ gatewayDeferHandlers: false, cache: { messages: 10 } });
    await guildHandlers.GUILD_CREATE!(client, {
      ...guildData('g1', 'Stats'),
      roles: [roleData('r1')],
      channels: [channelData('c1', 'g1')],
      members: [memberData('u1'), memberData('u2')],
    });
    client._addMessageToCache('c1', messageData('m1', 'c1'));
    client._addMessageToCache('c1', messageData('m2', 'c1'));

    const before = client.cache.stats();
    expect(before).toMatchObject({
      guilds: 1,
      channels: 1,
      members: 2,
      messages: 2,
      messageChannels: 1,
      roles: 1,
    });

    expect(client.cache.sweepMessages(() => true)).toBe(2);
    expect(client.cache.sweepMembers((m) => m.id === 'u2')).toBe(1);
    expect(client.cache.stats().members).toBe(1);
    expect(client.cache.stats().messages).toBe(0);

    expect(client.sweepMessages).toBeTypeOf('function');
    expect(client.sweepMembers).toBeTypeOf('function');
  });

  it('destroy() clears managers and message caches', async () => {
    const client = new Client({ gatewayDeferHandlers: false, cache: { messages: 10 } });
    await guildHandlers.GUILD_CREATE!(client, {
      ...guildData('g1', 'Destroy'),
      channels: [channelData('c1', 'g1')],
    });
    client._addMessageToCache('c1', messageData('m1', 'c1'));
    client.users.set('u1', { id: 'u1' } as never);

    await client.destroy();
    expect(client.guilds.size).toBe(0);
    expect(client.channels.size).toBe(0);
    expect(client.users.size).toBe(0);
    expect(client._getMessageCache('c1')).toBeNull();
    expect(client.cache.stats()).toMatchObject({
      guilds: 0,
      channels: 0,
      users: 0,
      messages: 0,
      messageChannels: 0,
    });
  });

  it('upsertGuildFromSnapshot is re-entrancy safe during channel prune', () => {
    const client = new Client({ gatewayDeferHandlers: false, cache: { messages: 10 } });
    const { guild } = upsertGuildFromSnapshot(client, guildData('g1'), {
      channels: [channelData('c1', 'g1'), channelData('c2', 'g1')],
      roles: [roleData('r1')],
    });
    client._addMessageToCache('c1', messageData('m1', 'c1'));

    const role = guild.roles.get('r1')!;
    expect(role).toBeInstanceOf(Role);

    upsertGuildFromSnapshot(client, guildData('g1', 'Pruned'), {
      channels: [channelData('c2', 'g1')],
      roles: [roleData('r1')],
    });

    expect(client.guilds.get('g1')).toBe(guild);
    expect(guild.roles.get('r1')).toBe(role);
    expect(client.channels.has('c1')).toBe(false);
    expect(guild.channels.has('c1')).toBe(false);
    expect(client._getMessageCache('c1')).toBeNull();
    expect(guild.channels.has('c2')).toBe(true);
  });
});
