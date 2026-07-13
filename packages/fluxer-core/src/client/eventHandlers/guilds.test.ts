import type { APIMessage } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { Guild } from '../../structures/Guild.js';
import { Events } from '../../util/Events.js';
import { Client } from '../Client.js';
import { shouldDeferGatewayDispatchUntilReady } from '../GatewayDispatch.js';
import { guildHandlers } from './guilds.js';

function guildPayload(name: string) {
  return {
    id: 'g1',
    name,
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
  };
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
  return {
    user: { id, username: id, discriminator: '0' },
    roles: [],
    joined_at: new Date(0).toISOString(),
  };
}

function message(id: string, channelId: string): APIMessage {
  return {
    id,
    channel_id: channelId,
    author: { id: 'author1', username: 'author', discriminator: '0' },
    type: 0,
    flags: 0,
    content: '',
    timestamp: new Date(0).toISOString(),
    edited_timestamp: null,
    pinned: false,
  };
}

async function dispatch(client: Client, event: 'GUILD_CREATE' | 'GUILD_DELETE', data: unknown) {
  await guildHandlers[event](client, data);
}

describe('guild availability lifecycle', () => {
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
      ...guildPayload('After outage'),
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
    expect(client._getMessageCache('removed-channel')?.has('removed-message')).toBe(false);
  });

  it.each([
    'GUILD_CREATE',
    'GUILD_DELETE',
  ] as const)('settles a pending startup guild on unavailable %s', async (event) => {
    const client = new Client({ waitForGuilds: true, gatewayDeferHandlers: false });
    client._pendingGuildIds = new Set(['g1']);
    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (payload: unknown) => Promise<void> }
    ).handleDispatch({ op: 0, t: event, d: { id: 'g1', unavailable: true } });

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
});
