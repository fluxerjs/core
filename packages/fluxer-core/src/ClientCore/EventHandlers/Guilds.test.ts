import type { APIMessage } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { Guild } from '../../Domain/Guild/Guild.js';
import { Events } from '../../Helpers/Events.js';
import {
  dispatchForTest,
  fixtureGuild,
  fixtureMember,
  fixtureMessage,
  fixtureUser,
} from '../../TestKit/Fixtures.js';
import { Client } from '../Client.js';
import { shouldDeferGatewayDispatchUntilReady } from '../GatewayDispatch.js';
import { handleReadyPayload, hydrateReadyGuilds, resetGuildStreamSettle } from '../GatewayReady.js';
import { guildHandlers } from './Guilds.js';

function guildPayload(name: string, id = 'g1') {
  return fixtureGuild({
    id,
    name,
    owner_id: 'owner1',
    afk_timeout: 0,
  });
}

function role(id: string) {
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

function channel(id: string) {
  return { id, guild_id: 'g1', type: 0, name: id };
}

function member(id: string) {
  return fixtureMember({ user: fixtureUser({ id, username: id }) });
}

function message(id: string, channelId: string): APIMessage {
  return fixtureMessage({
    id,
    channel_id: channelId,
    author: fixtureUser({ id: 'author1', username: 'author' }),
    content: '',
    timestamp: new Date(0).toISOString(),
  });
}

async function dispatch(
  client: Client,
  event: 'GUILD_CREATE' | 'GUILD_UPDATE' | 'GUILD_DELETE' | 'GUILD_COUNTS_UPDATE',
  data: unknown,
) {
  await guildHandlers[event](client, data);
}

describe('guild availability lifecycle', () => {
  it('hydrates nested GUILD_CREATE properties', async () => {
    const client = new Client({ gatewayDeferHandlers: false });

    await dispatch(client, 'GUILD_CREATE', {
      id: 'g1',
      properties: guildPayload('Nested Guild'),
      roles: [],
      channels: [],
      members: [],
      emojis: [],
    });

    expect(client.guilds.get('g1')).toMatchObject({
      id: 'g1',
      name: 'Nested Guild',
      ownerId: 'owner1',
    });
  });

  it('applies top-level member_count from nested GUILD_CREATE snapshots', async () => {
    const client = new Client({ gatewayDeferHandlers: false });

    await dispatch(client, 'GUILD_CREATE', {
      id: 'g1',
      properties: guildPayload('Counted Nested Guild'),
      member_count: 250,
      online_count: 40,
      roles: [],
      channels: [],
      members: [],
      emojis: [],
    });

    expect(client.guilds.get('g1')).toMatchObject({
      name: 'Counted Nested Guild',
      memberCount: 250,
      onlineCount: 40,
    });
  });

  it('keeps the last known memberCount when a repeated GUILD_CREATE omits it', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const existing = new Guild(client, { ...guildPayload('Existing guild'), member_count: 120 });
    client.guilds.set(existing.id, existing);

    await dispatch(client, 'GUILD_CREATE', guildPayload('Refreshed guild'));
    expect(client.guilds.get(existing.id)).toMatchObject({
      name: 'Refreshed guild',
      memberCount: 120,
    });

    await dispatch(client, 'GUILD_CREATE', {
      ...guildPayload('Counted guild'),
      member_count: 140,
    });
    expect(client.guilds.get(existing.id)?.memberCount).toBe(140);
  });

  it('keeps memberCount across unavailable recovery when GUILD_CREATE omits it', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, { ...guildPayload('Recovering guild'), member_count: 120 });
    guild.available = false;
    client.guilds.set(guild.id, guild);

    await dispatch(client, 'GUILD_CREATE', guildPayload('Recovered guild'));

    expect(client.guilds.get(guild.id)).toBe(guild);
    expect(guild).toMatchObject({
      name: 'Recovered guild',
      available: true,
      memberCount: 120,
    });
  });

  it('updates cached counts from GUILD_COUNTS_UPDATE', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, guildPayload('Counted guild'));
    client.guilds.set(guild.id, guild);
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_COUNTS_UPDATE', {
      counts: [{ guild_id: guild.id, member_count: 140, online_count: 9 }],
    });

    expect(guild).toMatchObject({ memberCount: 140, onlineCount: 9 });
    expect(emit).toHaveBeenCalledWith(Events.GuildCountsUpdate, {
      counts: [{ guildId: guild.id, memberCount: 140, onlineCount: 9 }],
    });
  });

  it('updates onlineCount alone when GUILD_COUNTS_UPDATE omits member_count', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, { ...guildPayload('Partial counts'), member_count: 50 });
    client.guilds.set(guild.id, guild);

    await dispatch(client, 'GUILD_COUNTS_UPDATE', {
      counts: [{ guild_id: guild.id, online_count: 12 }],
    });

    expect(guild).toMatchObject({ memberCount: 50, onlineCount: 12 });
  });

  it('treats GUILD_UPDATE as flat when it contains a properties field', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, guildPayload('Before update'));
    client.guilds.set(guild.id, guild);

    await dispatch(client, 'GUILD_UPDATE', {
      id: 'g1',
      name: 'Outer update',
      properties: guildPayload('Nested collision'),
    });

    expect(guild.name).toBe('Outer update');
  });

  it('retains a temporarily unavailable guild and emits GuildUnavailable', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, guildPayload('Before outage'));
    client.guilds.set(guild.id, guild);
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_DELETE', { id: guild.id, unavailable: true });

    expect(client.guilds.get(guild.id)).toBe(guild);
    expect(guild.available).toBe(false);
    expect(emit).toHaveBeenCalledWith(Events.GuildUnavailable, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildDelete)).toBe(false);
  });

  it('restores the same guild instance from the next available GUILD_CREATE snapshot', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_CREATE', {
      ...guildPayload('Before outage'),
      roles: [role('old-role')],
      channels: [channel('old-channel')],
      members: [member('old-member')],
    });
    const guild = client.guilds.get('g1');
    expect(guild).toBeDefined();

    await dispatch(client, 'GUILD_DELETE', { id: 'g1', unavailable: true });
    emit.mockClear();
    await dispatch(client, 'GUILD_CREATE', {
      id: 'g1',
      properties: guildPayload('After outage'),
      roles: [role('new-role')],
      channels: [channel('new-channel')],
      members: [member('new-member')],
    });

    expect(client.guilds.get('g1')).toBe(guild);
    expect(guild?.available).toBe(true);
    expect(guild?.name).toBe('After outage');
    expect(guild?.roles.has('old-role')).toBe(false);
    expect(guild?.roles.has('new-role')).toBe(true);
    expect(guild?.channels.has('old-channel')).toBe(false);
    expect(client.channels.has('old-channel')).toBe(false);
    expect(guild?.channels.has('new-channel')).toBe(true);
    expect(client.channels.has('new-channel')).toBe(true);
    // Recovery member snapshots are partial, so previously cached members remain.
    expect(guild?.members.has('old-member')).toBe(true);
    expect(guild?.members.has('new-member')).toBe(true);
    expect(emit).toHaveBeenCalledWith(Events.GuildAvailable, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildCreate)).toBe(false);
  });

  it('keeps permanent GUILD_DELETE behavior after an outage', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, guildPayload('Removed guild'));
    guild.available = false;
    client.guilds.set(guild.id, guild);
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_DELETE', { id: guild.id });

    expect(client.guilds.has(guild.id)).toBe(false);
    expect(emit).toHaveBeenCalledWith(Events.GuildDelete, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildUnavailable)).toBe(false);
  });

  it('emits GuildUnavailable only when availability changes', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, guildPayload('Outage guild'));
    client.guilds.set(guild.id, guild);
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_DELETE', { id: guild.id, unavailable: true });
    await dispatch(client, 'GUILD_CREATE', { id: guild.id, unavailable: true });

    expect(emit.mock.calls.filter(([event]) => event === Events.GuildUnavailable)).toHaveLength(1);
  });

  it('keeps a recovered guild unavailable when cache rebuilding fails', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const guild = new Guild(client, guildPayload('Recovering guild'));
    guild.available = false;
    client.guilds.set(guild.id, guild);
    const setChannel = vi.spyOn(client.channels, 'set').mockImplementationOnce(() => {
      throw new Error('cache write failed');
    });

    try {
      await expect(
        dispatch(client, 'GUILD_CREATE', {
          ...guildPayload('Recovered guild'),
          channels: [channel('new-channel')],
        }),
      ).rejects.toThrow('cache write failed');
      expect(guild.available).toBe(false);
    } finally {
      setChannel.mockRestore();
    }
  });

  it('clears message caches only for channels absent from the recovery snapshot', async () => {
    const client = new Client({ gatewayDeferHandlers: false, cache: { messages: 10 } });
    await dispatch(client, 'GUILD_CREATE', {
      ...guildPayload('Before outage'),
      channels: [channel('retained-channel'), channel('removed-channel')],
    });
    client._addMessageToCache('retained-channel', message('retained-message', 'retained-channel'));
    client._addMessageToCache('removed-channel', message('removed-message', 'removed-channel'));

    await dispatch(client, 'GUILD_DELETE', { id: 'g1', unavailable: true });
    await dispatch(client, 'GUILD_CREATE', {
      ...guildPayload('After outage'),
      channels: [channel('retained-channel')],
    });

    expect(client._getMessageCache('retained-channel')?.has('retained-message')).toBe(true);
    // Cleared channel maps are removed entirely (get() no longer creates empty maps).
    expect(client._getMessageCache('removed-channel')?.has('removed-message') ?? false).toBe(false);
  });

  it.each([
    'GUILD_CREATE',
    'GUILD_DELETE',
  ] as const)('settles a pending startup guild on unavailable %s', async (event) => {
    const client = new Client({ waitForGuilds: true, gatewayDeferHandlers: false });
    client._pendingGuildIds = new Set(['g1']);
    const emit = vi.spyOn(client, 'emit');

    await dispatchForTest(client, event, { id: 'g1', unavailable: true });

    expect(client._pendingGuildIds).toBeNull();
    expect(client.readyAt).toBeInstanceOf(Date);
    expect(client.guilds.has('g1')).toBe(false);
    expect(emit).toHaveBeenCalledWith(Events.Ready);
  });

  it('runs only pending guild deletes before Ready', () => {
    const client = new Client({ waitForGuilds: true });
    client._pendingGuildIds = new Set(['g1']);

    expect(
      shouldDeferGatewayDispatchUntilReady(client, {
        op: 0,
        t: 'GUILD_DELETE',
        s: 1,
        d: { id: 'g1', unavailable: true },
      }),
    ).toBe(false);
    expect(
      shouldDeferGatewayDispatchUntilReady(client, {
        op: 0,
        t: 'GUILD_DELETE',
        s: 2,
        d: { id: 'g2', unavailable: true },
      }),
    ).toBe(true);
  });

  it('ignores unavailable stubs for guilds that are not cached yet', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_CREATE', { id: 'g1', unavailable: true });
    await dispatch(client, 'GUILD_DELETE', { id: 'g1', unavailable: true });

    expect(client.guilds.has('g1')).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits GuildAvailable (not GuildCreate) when hydrating a READY unavailable stub', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    hydrateReadyGuilds(client, [{ id: 'g1', unavailable: true }], false);
    expect(client.guilds.get('g1')?.available).toBe(false);
    expect(client._readyStubGuildIds.has('g1')).toBe(true);

    const emit = vi.spyOn(client, 'emit');
    await dispatch(client, 'GUILD_CREATE', {
      ...guildPayload('Hydrated'),
      roles: [role('r1')],
      channels: [channel('c1')],
    });

    const guild = client.guilds.get('g1');
    expect(guild?.available).toBe(true);
    expect(guild?.name).toBe('Hydrated');
    expect(client._readyStubGuildIds.has('g1')).toBe(false);
    expect(emit).toHaveBeenCalledWith(Events.GuildAvailable, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildCreate)).toBe(false);
  });

  it('emits GuildCreate for a real join after Ready with no prior stub', async () => {
    const client = new Client({ gatewayDeferHandlers: false });
    client.readyAt = new Date();
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_CREATE', guildPayload('Newly joined'));

    const guild = client.guilds.get('g1');
    expect(guild?.name).toBe('Newly joined');
    expect(emit).toHaveBeenCalledWith(Events.GuildCreate, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildAvailable)).toBe(false);
  });

  it('emits GuildCreate for READY stub hydration when emitGuildCreateOnStartup is true', async () => {
    const client = new Client({
      gatewayDeferHandlers: false,
      emitGuildCreateOnStartup: true,
    });
    hydrateReadyGuilds(client, [{ id: 'g1', unavailable: true }], false);
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_CREATE', guildPayload('Legacy startup'));

    const guild = client.guilds.get('g1');
    expect(emit).toHaveBeenCalledWith(Events.GuildCreate, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildAvailable)).toBe(false);
  });

  it('keeps GuildAvailable for outage recovery even with emitGuildCreateOnStartup', async () => {
    const client = new Client({
      gatewayDeferHandlers: false,
      emitGuildCreateOnStartup: true,
    });
    await dispatch(client, 'GUILD_CREATE', guildPayload('Before outage'));
    const guild = client.guilds.get('g1');
    client.readyAt = new Date();
    await dispatch(client, 'GUILD_DELETE', { id: 'g1', unavailable: true });
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_CREATE', guildPayload('After outage'));

    expect(emit).toHaveBeenCalledWith(Events.GuildAvailable, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildCreate)).toBe(false);
  });

  it('emits GuildAvailable during empty-READY settle stream (not GuildCreate)', async () => {
    const client = new Client({ waitForGuilds: true, gatewayDeferHandlers: false });
    resetGuildStreamSettle(client);
    expect(client._guildStreamSettleTimeout).not.toBeNull();
    const emit = vi.spyOn(client, 'emit');

    await dispatch(client, 'GUILD_CREATE', guildPayload('Stream guild'));

    const guild = client.guilds.get('g1');
    expect(guild?.name).toBe('Stream guild');
    expect(emit).toHaveBeenCalledWith(Events.GuildAvailable, guild);
    expect(emit.mock.calls.some(([event]) => event === Events.GuildCreate)).toBe(false);
    expect(client._guildStreamSettleTimeout).not.toBeNull();
  });

  it('treats empty-READY hydrations after Ready as GuildAvailable without waitForGuilds', async () => {
    vi.useFakeTimers();
    try {
      const client = new Client({ gatewayDeferHandlers: false });
      handleReadyPayload(client, {
        user: fixtureUser({ id: 'bot1', username: 'bot' }),
        guilds: [],
        session_id: 's1',
      });
      expect(client.readyAt).toBeInstanceOf(Date);
      expect(client._guildStreamSettleTimeout).not.toBeNull();

      const emit = vi.spyOn(client, 'emit');
      await dispatch(client, 'GUILD_CREATE', guildPayload('Existing guild'));

      const guild = client.guilds.get('g1');
      expect(emit).toHaveBeenCalledWith(Events.GuildAvailable, guild);
      expect(emit.mock.calls.some(([event]) => event === Events.GuildCreate)).toBe(false);

      await vi.advanceTimersByTimeAsync(500);
      expect(client._guildStreamSettleTimeout).toBeNull();
      emit.mockClear();

      await dispatch(client, 'GUILD_CREATE', guildPayload('Joined later', 'g2'));
      expect(emit).toHaveBeenCalledWith(Events.GuildCreate, client.guilds.get('g2'));
      expect(emit.mock.calls.some(([event]) => event === Events.GuildAvailable)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
