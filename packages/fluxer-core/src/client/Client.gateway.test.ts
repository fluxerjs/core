import type { APIUser } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Guild } from '../structures/Guild.js';
import { Invite } from '../structures/Invite.js';
import { Events } from '../util/Events.js';
import { Client } from './Client.js';
import { ClientUser } from './ClientUser.js';
import { hydrateReadyGuilds } from './GatewayReady.js';

describe('Client gateway helpers and dispatch', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client();
  });

  it('hydrates nested READY guild properties before caching', async () => {
    hydrateReadyGuilds(
      client,
      [
        {
          id: 'g1',
          properties: {
            id: 'g1',
            name: 'Nested Guild',
            icon: 'icon-hash',
            banner: null,
            splash: 'splash-hash',
            owner_id: 'owner1',
            features: ['BANNER'],
            afk_timeout: 300,
            nsfw_level: 0,
            verification_level: 1,
            mfa_level: 0,
            explicit_content_filter: 2,
            default_message_notifications: 1,
          },
          channels: [],
          roles: [],
          members: [],
          emojis: [],
        },
      ],
      false,
    );
    const get = vi.spyOn(client.rest, 'get');

    const guild = await client.guilds.fetch('g1');

    expect(guild).toMatchObject({
      id: 'g1',
      name: 'Nested Guild',
      icon: 'icon-hash',
      splash: 'splash-hash',
      ownerId: 'owner1',
      features: ['BANNER'],
      afkTimeout: 300,
      verificationLevel: 1,
      explicitContentFilter: 2,
      defaultMessageNotifications: 1,
    });
    expect(get).not.toHaveBeenCalled();
  });

  it('fetchGatewayInfo() fetches gateway metadata from /gateway/bot', async () => {
    const gatewayInfo = {
      url: 'wss://gateway.fluxer.app',
      shards: 2,
      session_start_limit: {
        total: 1000,
        remaining: 999,
        reset_after: 60000,
        max_concurrency: 1,
      },
    };
    const get = vi.spyOn(client.rest, 'get').mockResolvedValue(gatewayInfo);

    const result = await client.fetchGatewayInfo();

    expect(get).toHaveBeenCalledWith(Routes.gatewayBot());
    expect(result).toEqual(gatewayInfo);
  });

  it('emits InviteCreate for partial INVITE_CREATE payloads', async () => {
    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (payload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'INVITE_CREATE',
      d: {
        code: 'abc123',
        guild_id: 'g1',
        channel_id: 'c1',
      },
    });

    const inviteCall = emit.mock.calls.find((call) => call[0] === Events.InviteCreate);
    expect(inviteCall).toBeTruthy();
    const invite = inviteCall?.[1] as Invite;
    expect(invite).toBeInstanceOf(Invite);
    expect(invite.code).toBe('abc123');
    expect(invite.guild?.id).toBe('g1');
    expect(invite.channel?.id).toBe('c1');
  });

  it('ignores malformed INVITE_CREATE payloads without code and logs debug message', async () => {
    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (payload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'INVITE_CREATE',
      d: {
        guild_id: 'g1',
        channel_id: 'c1',
      },
    });

    expect(emit.mock.calls.some((call) => call[0] === Events.InviteCreate)).toBe(false);
    const debugCall = emit.mock.calls.find(
      (call) =>
        call[0] === Events.Debug &&
        String(call[1]).includes('INVITE_CREATE payload had no invite code'),
    );
    expect(debugCall).toBeTruthy();
  });

  it('handles GUILD_MEMBERS_CHUNK by caching members and emitting GuildMembersChunk', async () => {
    const guild = new Guild(client, {
      id: 'g1',
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
    client.guilds.set(guild.id, guild);

    const emit = vi.spyOn(client, 'emit');
    const payload = {
      guild_id: 'g1',
      chunk_index: 0,
      chunk_count: 1,
      members: [
        {
          user: { id: 'u1', username: 'alice', discriminator: '0' },
          roles: [],
          joined_at: new Date().toISOString(),
        },
      ],
      nonce: 'test-nonce',
    };

    await (
      client as unknown as { handleDispatch: (dispatchPayload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'GUILD_MEMBERS_CHUNK',
      d: payload,
    });

    const member = guild.members.get('u1');
    expect(member).toBeTruthy();
    expect(member?.id).toBe('u1');

    const chunkCall = emit.mock.calls.find((call) => call[0] === Events.GuildMembersChunk);
    expect(chunkCall).toBeTruthy();
    expect(chunkCall?.[1]).toMatchObject({
      guildId: 'g1',
      chunkIndex: 0,
      chunkCount: 1,
      nonce: 'test-nonce',
      notFound: [],
    });
    expect((chunkCall![1] as { members: unknown[] }).members).toHaveLength(1);
  });

  it('emits GuildMembersChunk even when guild is not cached', async () => {
    const emit = vi.spyOn(client, 'emit');
    const payload = {
      guild_id: 'missing-guild',
      chunk_index: 0,
      chunk_count: 1,
      members: [],
      nonce: 'missing-guild',
    };

    await (
      client as unknown as { handleDispatch: (dispatchPayload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'GUILD_MEMBERS_CHUNK',
      d: payload,
    });

    const chunkCall = emit.mock.calls.find((call) => call[0] === Events.GuildMembersChunk);
    expect(chunkCall).toBeTruthy();
    expect(chunkCall?.[1]).toEqual({
      guildId: 'missing-guild',
      members: [],
      chunkIndex: 0,
      chunkCount: 1,
      notFound: [],
      nonce: 'missing-guild',
    });
  });

  it('ignores invalid members in GUILD_MEMBERS_CHUNK and caches valid ones', async () => {
    const guild = new Guild(client, {
      id: 'g2',
      name: 'Test Guild 2',
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
    client.guilds.set(guild.id, guild);

    await (
      client as unknown as { handleDispatch: (dispatchPayload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'GUILD_MEMBERS_CHUNK',
      d: {
        guild_id: 'g2',
        chunk_index: 0,
        chunk_count: 1,
        members: [
          {
            roles: [],
            joined_at: new Date().toISOString(),
          },
          {
            user: { id: 'u2', username: 'bob', discriminator: '0' },
            roles: [],
            joined_at: new Date().toISOString(),
          },
        ],
      },
    });

    expect(guild.members.get('u2')).toBeTruthy();
    expect(guild.members.size).toBe(1);
  });

  it('defers MESSAGE_CREATE until Ready when waitForGuilds is true', async () => {
    const client = new Client({ waitForGuilds: true, gatewayDeferHandlers: false });
    client.user = new ClientUser(client, {
      id: 'bot1',
      username: 'bot',
      discriminator: '0',
    } as APIUser);
    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (dispatchPayload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'MESSAGE_CREATE',
      d: {
        id: 'm1',
        channel_id: 'c1',
        guild_id: 'g1',
        content: 'hi',
        timestamp: new Date().toISOString(),
        pinned: false,
        author: { id: 'u1', username: 'alice', discriminator: '0' },
      },
    });

    expect(emit.mock.calls.some((c) => c[0] === Events.MessageCreate)).toBe(false);

    client._finalizeReady();

    expect(emit.mock.calls.some((c) => c[0] === Events.Ready)).toBe(true);
    expect(emit.mock.calls.some((c) => c[0] === Events.MessageCreate)).toBe(true);
    const readyIdx = emit.mock.calls.findIndex((c) => c[0] === Events.Ready);
    const msgIdx = emit.mock.calls.findIndex((c) => c[0] === Events.MessageCreate);
    expect(readyIdx).toBeLessThan(msgIdx);
  });

  it('still runs GUILD_CREATE before Ready when waitForGuilds is true', async () => {
    const client = new Client({ waitForGuilds: true, gatewayDeferHandlers: false });
    client.user = new ClientUser(client, {
      id: 'bot1',
      username: 'bot',
      discriminator: '0',
    } as APIUser);
    const emit = vi.spyOn(client, 'emit');

    await (
      client as unknown as { handleDispatch: (dispatchPayload: unknown) => Promise<void> }
    ).handleDispatch({
      op: 0,
      t: 'GUILD_CREATE',
      d: {
        id: 'g1',
        name: 'Test',
        icon: null,
        banner: null,
        splash: null,
        owner_id: 'o1',
        features: [],
        afk_timeout: 0,
        nsfw_level: 0,
        verification_level: 0,
        mfa_level: 0,
        explicit_content_filter: 0,
        default_message_notifications: 0,
      },
    });

    expect(emit.mock.calls.some((c) => c[0] === Events.GuildCreate)).toBe(true);
    expect(emit.mock.calls.some((c) => c[0] === Events.Ready)).toBe(false);
  });
});
