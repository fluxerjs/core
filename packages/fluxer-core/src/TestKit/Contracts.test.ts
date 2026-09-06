import type { APIMessage } from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import type { Client } from '../ClientCore/Client.js';
import {
  CategoryChannel,
  Channel,
  LinkChannel,
  TextChannel,
  VoiceChannel,
} from '../Domain/Channel/index.js';
import { Guild } from '../Domain/Guild/Guild.js';
import { Message } from '../Domain/Message/index.js';
import { Events } from '../Helpers/Events.js';
import {
  createTestClient,
  dispatchForTest,
  fixtureGuild,
  fixtureMessage,
  fixtureTextChannel,
  fixtureUser,
} from './Fixtures.js';

describe('bulkDelete validation', () => {
  it('no-ops for empty ID list', async () => {
    const client = createTestClient();
    const ch = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    await expect(ch.bulkDelete([])).resolves.toEqual([]);
  });

  it('uses single DELETE for one ID', async () => {
    const client = createTestClient();
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    const ch = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    await expect(ch.bulkDelete(['a'])).resolves.toEqual(['a']);
    expect(del).toHaveBeenCalled();
  });

  it('throws for more than 100 IDs', async () => {
    const client = createTestClient();
    const ch = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    const ids = Array.from({ length: 101 }, (_, i) => String(i));
    await expect(ch.bulkDelete(ids)).rejects.toThrow(/at most 100/);
  });

  it('posts when count is in range', async () => {
    const client = createTestClient();
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue(undefined);
    const ch = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    await ch.bulkDelete(['a', 'b']);
    expect(post).toHaveBeenCalled();
  });
});

describe('message.reply defaults and two-arg merge', () => {
  function makeMessage(client: Client): Message {
    return new Message(
      client,
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        guild_id: 'g1',
        author: fixtureUser({
          id: 'u1',
          username: 'user',
          avatar: null,
          bot: false,
        }),
        content: 'hi',
        timestamp: new Date().toISOString(),
      }),
    );
  }

  it('applies second-arg ping:false over defaults', async () => {
    const client = createTestClient({ defaultReplyPing: true });
    const msg = makeMessage(client);
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({
      ...msg,
      id: 'm2',
      content: 'pong',
    } as unknown as APIMessage);
    await msg.reply('pong', { ping: false });
    const payload = post.mock.calls[0]![1] as {
      body: { flags?: number; allowed_mentions?: unknown };
    };
    expect(payload.body.flags).toBeUndefined();
    expect(payload.body.allowed_mentions).toEqual({ replied_user: false });
  });

  it('uses defaultReplyPing false when no ping provided', async () => {
    const client = createTestClient({ defaultReplyPing: false });
    const msg = makeMessage(client);
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({
      id: 'm2',
      channel_id: 'c1',
      author: { id: 'bot', username: 'b', discriminator: '0', bot: true },
      type: 19,
      flags: 0,
      content: 'pong',
      timestamp: new Date().toISOString(),
      edited_timestamp: null,
      pinned: false,
    } as APIMessage);
    await msg.reply('pong');
    const payload = post.mock.calls[0]![1] as {
      body: { flags?: number; allowed_mentions?: unknown };
    };
    expect(payload.body.flags).toBeUndefined();
    expect(payload.body.allowed_mentions).toEqual({ replied_user: false });
  });

  it('applies defaultAllowedMentions when call omits allowedMentions', async () => {
    const client = createTestClient({
      defaultAllowedMentions: { parse: [], repliedUser: false },
    });
    const msg = makeMessage(client);
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue({
      id: 'm2',
      channel_id: 'c1',
      author: { id: 'bot', username: 'b', discriminator: '0', bot: true },
      type: 19,
      flags: 0,
      content: 'pong',
      timestamp: new Date().toISOString(),
      edited_timestamp: null,
      pinned: false,
    } as APIMessage);
    await msg.reply('pong');
    const payload = post.mock.calls[0]![1] as { body: { allowed_mentions?: unknown } };
    expect(payload.body.allowed_mentions).toEqual({ parse: [], replied_user: false });
  });
});

describe('GUILD_UPDATE preserves nested caches', () => {
  it('patches in place and keeps members/channels', async () => {
    const client = createTestClient();
    const guild = new Guild(
      client,
      fixtureGuild({
        id: 'g1',
        name: 'Old',
        owner_id: 'owner1',
      }),
    );
    client.guilds.set(guild.id, guild);
    const ch = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    guild.channels.set(ch.id, ch);
    client.channels.set(ch.id, ch);

    const emit = vi.spyOn(client, 'emit');
    await dispatchForTest(client, 'GUILD_UPDATE', {
      ...fixtureGuild({
        id: 'g1',
        name: 'New Name',
        owner_id: 'owner1',
      }),
    });

    expect(client.guilds.get('g1')).toBe(guild);
    expect(guild.name).toBe('New Name');
    expect(guild.channels.get('c1')).toBe(ch);
    expect(emit.mock.calls.some((c) => c[0] === Events.GuildUpdate)).toBe(true);
  });
});

describe('Channel type guard smoke', () => {
  it('Channel.fromOrCreate returns DM for DM type', () => {
    const client = createTestClient();
    const ch = Channel.fromOrCreate(client, {
      id: 'dm1',
      type: ChannelType.DM,
      recipients: [],
    });
    expect(ch?.isDM()).toBe(true);
  });

  it('Channel.fromOrCreate maps DMPersonalNotes (999)', () => {
    const client = createTestClient();
    const ch = Channel.fromOrCreate(client, {
      id: 'notes1',
      type: ChannelType.DMPersonalNotes,
      recipients: [],
    });
    expect(ch?.isDM()).toBe(true);
    expect(ch?.isPersonalNotes()).toBe(true);
    expect(ch?.isTextBased()).toBe(true);
  });

  it('isGuild / isText / isCategory discriminate channel kinds', () => {
    const client = createTestClient();
    const text = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    expect(text.isGuild()).toBe(true);
    expect(text.isText()).toBe(true);
    expect(text.isCategory()).toBe(false);
    expect(text.isTextBased()).toBe(true);
    expect(text.isVoice()).toBe(false);
    expect(text.isLink()).toBe(false);

    const voice = new VoiceChannel(client, {
      id: 'v1',
      type: ChannelType.GuildVoice,
      guild_id: 'g1',
      name: 'Voice',
      parent_id: null,
    });
    expect(voice.isGuild()).toBe(true);
    expect(voice.isVoice()).toBe(true);
    expect(voice.isTextBased()).toBe(true);
    expect(typeof voice.send).toBe('function');

    const link = new LinkChannel(client, {
      id: 'l1',
      type: ChannelType.GuildLink,
      guild_id: 'g1',
      name: 'Link',
      parent_id: null,
      url: 'https://example.com',
    });
    expect(link.isGuild()).toBe(true);
    expect(link.isLink()).toBe(true);
    expect(link.isVoice()).toBe(false);
  });
});

describe('Channel.delete', () => {
  it('is available on the base Channel type and drops cache', async () => {
    const client = createTestClient();
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    const ch: Channel = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'tickets',
      parent_id: null,
    });
    client.channels.set(ch.id, ch);

    await ch.delete();

    expect(del).toHaveBeenCalledWith(Routes.channel('c1'), { body: undefined, auth: true });
    expect(client.channels.get('c1')).toBeUndefined();
  });

  it('forwards silent and deleteMessages as query params', async () => {
    const client = createTestClient();
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    const ch: Channel = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'tickets',
      parent_id: null,
    });

    await ch.delete({ silent: true, deleteMessages: true });

    expect(del).toHaveBeenCalledWith(`${Routes.channel('c1')}?silent=true&delete_messages=true`, {
      body: undefined,
      auth: true,
    });
  });
});

describe('Channel.send', () => {
  it('is available on text-capable channels', async () => {
    const client = createTestClient();
    const post = vi
      .spyOn(client.rest, 'post')
      .mockResolvedValue(fixtureMessage({ id: 'm1', channel_id: 'c1', content: 'hi' }));
    const ch = new TextChannel(client, {
      id: 'c1',
      type: ChannelType.GuildText,
      guild_id: 'g1',
      name: 'general',
      parent_id: null,
    });
    client.channels.set(ch.id, ch);

    const sent = await ch.send('hi');
    expect(sent).toBeInstanceOf(Message);
    expect(post).toHaveBeenCalled();
  });

  it('is not present on category channels', () => {
    const client = createTestClient();
    const ch: Channel = new CategoryChannel(client, {
      id: 'cat1',
      type: ChannelType.GuildCategory,
      guild_id: 'g1',
      name: 'stuff',
      parent_id: null,
    });
    expect('send' in ch && typeof (ch as { send?: unknown }).send === 'function').toBe(false);
  });
});

describe('ChannelManager.fetch', () => {
  it('returns a Channel with delete; text channels also have send', async () => {
    const client = createTestClient();
    vi.spyOn(client.rest, 'get').mockResolvedValue(
      fixtureTextChannel({ id: 'c1', guild_id: 'g1' }),
    );
    const ch = await client.channels.fetch('c1');
    expect(ch).toBeInstanceOf(Channel);
    expect(typeof ch.delete).toBe('function');
    expect(ch.isTextBased()).toBe(true);
    if (ch.isTextBased()) {
      expect(typeof ch.send).toBe('function');
    }
    expect(ch.toString()).toBe('<#c1>');

    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);
    await ch.delete();
    expect(del).toHaveBeenCalledWith(Routes.channel('c1'), { body: undefined, auth: true });
  });
});
