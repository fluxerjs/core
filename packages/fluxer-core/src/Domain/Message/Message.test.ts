import type { APIMessage } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { MessageFlagsBitField } from '@fluxerjs/util';
import { describe, expect, it, vi } from 'vitest';
import type { Client } from '../../ClientCore/Client.js';
import {
  createMessageStubClient,
  createTestClient,
  fixtureGuild,
  fixtureMember,
  fixtureMessage,
  fixtureTextChannel,
  fixtureUser,
} from '../../TestKit/Fixtures.js';
import { TextChannel } from '../Channel/index.js';
import { Guild } from '../Guild/Guild.js';
import { GuildMember } from '../Guild/GuildMember.js';
import { Message } from './Message.js';
import { PartialMessage } from './PartialMessage.js';

function makeMessage(client: Client, overrides: Partial<APIMessage> = {}): Message {
  return new Message(
    client,
    fixtureMessage({
      id: 'm1',
      channel_id: 'c1',
      guild_id: 'g1',
      author: fixtureUser({ id: 'u1', username: 'alice', bot: false }),
      content: 'hi',
      ...overrides,
    }),
  );
}

describe('Message._createMessageBody', () => {
  it('includes message_reference when replying', async () => {
    const ref = { channel_id: 'ch1', message_id: 'msg1', guild_id: 'g1' };
    const payload = await Message._createMessageBody('Pong!', ref);
    expect(payload.body.message_reference).toEqual(ref);
    expect(payload.body.content).toBe('Pong!');
    expect(payload.body).not.toHaveProperty('referenced_message');
  });

  it('includes message_reference with options object', async () => {
    const ref = { channel_id: 'ch1', message_id: 'msg1', guild_id: 'g1' };
    const payload = await Message._createMessageBody({ content: 'Hello', embeds: [] }, ref);
    expect(payload.body.message_reference).toEqual(ref);
    expect(payload.body.content).toBe('Hello');
  });

  it('works without guild_id for DMs', async () => {
    const ref = { channel_id: 'dm1', message_id: 'msg1' };
    const payload = await Message._createMessageBody('DM reply', ref);
    expect(payload.body.message_reference).toEqual(ref);
    expect(payload.body.message_reference).not.toHaveProperty('guild_id');
  });

  it('omits message_reference for standalone send', async () => {
    const payload = await Message._createMessageBody('Standalone');
    expect(payload.body).not.toHaveProperty('message_reference');
    expect(payload.body.content).toBe('Standalone');
  });

  it('throws on empty string', async () => {
    await expect(Message._createMessageBody('')).rejects.toThrow(/Cannot send an empty message/);
  });

  it('includes files from AttachmentBuilder', async () => {
    const { AttachmentBuilder } = await import('@fluxerjs/builders');
    const data = Buffer.from('hello');
    const payload = await Message._createMessageBody({
      content: 'File attached',
      files: [new AttachmentBuilder(data, { name: 'report.txt', description: 'Report' })],
    });
    expect(payload.files).toHaveLength(1);
    expect(payload.files![0]!.name).toBe('report.txt');
    expect(payload.body.attachments).toEqual([
      { id: 0, filename: 'report.txt', description: 'Report' },
    ]);
  });

  it('reply with files includes message_reference', async () => {
    const ref = { channel_id: 'ch1', message_id: 'msg1' };
    const payload = await Message._createMessageBody(
      { content: 'Reply with file', files: [{ name: 'a.txt', data: Buffer.from('x') }] },
      ref,
    );
    expect(payload.body.message_reference).toEqual(ref);
    expect(payload.files).toHaveLength(1);
  });

  it('ping: false sets allowed_mentions.replied_user false', async () => {
    const ref = { channel_id: 'ch1', message_id: 'msg1' };
    const payload = await Message._createMessageBody('No ping', ref, false);
    expect(payload.body.message_reference).toEqual(ref);
    expect(payload.body.flags).toBeUndefined();
    expect(payload.body.allowed_mentions).toEqual({ replied_user: false });
  });

  it('ping: true does not suppress', async () => {
    const ref = { channel_id: 'ch1', message_id: 'msg1' };
    const payload = await Message._createMessageBody('Ping!', ref, true);
    expect(payload.body.allowed_mentions?.replied_user).not.toBe(false);
  });
});

describe('Message.reply', () => {
  it('two-arg ping:false suppresses replied_user', async () => {
    const client = createMessageStubClient({ defaultReplyPing: true });
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

    await msg.reply('pong', { ping: false });

    const payload = post.mock.calls[0]![1] as {
      body: { flags?: number; allowed_mentions?: unknown; message_reference?: unknown };
    };
    expect(payload.body.flags).toBeUndefined();
    expect(payload.body.allowed_mentions).toEqual({ replied_user: false });
    expect(payload.body.message_reference).toEqual({
      channel_id: 'c1',
      message_id: 'm1',
      guild_id: 'g1',
    });
  });

  it('uses defaultReplyPing false when ping omitted', async () => {
    const client = createMessageStubClient({ defaultReplyPing: false });
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
    expect(payload.body.allowed_mentions).toEqual({ replied_user: false });
  });

  it('applies defaultAllowedMentions when call omits allowedMentions', async () => {
    const client = createMessageStubClient({
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

  it('second-arg ping wins over first-arg ping', async () => {
    const client = createMessageStubClient({ defaultReplyPing: true });
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

    await msg.reply({ content: 'pong', ping: true }, { ping: false });

    const payload = post.mock.calls[0]![1] as { body: { allowed_mentions?: unknown } };
    expect(payload.body.allowed_mentions).toEqual({ replied_user: false });
  });
});

describe('Message collection fields (Fluxer null / [] / omit)', () => {
  it.each([undefined, null, []] as const)('normalizes embeds=%j to an empty array', (embeds) => {
    const msg = makeMessage(createMessageStubClient(), {
      embeds: embeds as APIMessage['embeds'],
    });
    expect(msg.embeds).toEqual([]);
  });

  it.each([
    undefined,
    null,
    [],
  ] as const)('normalizes attachments=%j to an empty collection', (attachments) => {
    const msg = makeMessage(createMessageStubClient(), {
      attachments: attachments as APIMessage['attachments'],
    });
    expect(msg.attachments.size).toBe(0);
  });

  it.each([
    undefined,
    null,
    [],
  ] as const)('normalizes stickers=%j to an empty array', (stickers) => {
    const msg = makeMessage(createMessageStubClient(), {
      stickers: stickers as APIMessage['stickers'],
    });
    expect(msg.stickers).toEqual([]);
  });

  it.each([
    undefined,
    null,
    [],
  ] as const)('normalizes reactions=%j to an empty manager', (reactions) => {
    const msg = makeMessage(createMessageStubClient(), {
      reactions: reactions as APIMessage['reactions'],
    });
    expect(msg.reactions.size).toBe(0);
  });

  it.each([
    undefined,
    null,
    [],
  ] as const)('normalizes mentions=%j to an empty array', (mentions) => {
    const msg = makeMessage(createMessageStubClient(), {
      mentions: mentions as unknown as APIMessage['mentions'],
    });
    expect(msg.mentions).toEqual([]);
  });

  it('keeps provided embeds and attachments', () => {
    const embed = { title: 't', type: 'rich' as const };
    const attachment = {
      id: 'a1',
      filename: 'x.png',
      size: 1,
      url: 'https://cdn.example/x.png',
      proxy_url: 'https://cdn.example/x.png',
    };
    const msg = makeMessage(createMessageStubClient(), {
      embeds: [embed],
      attachments: [attachment],
    });
    expect(msg.embeds[0]).toMatchObject({ type: 'rich', title: 't' });
    expect(msg.embeds[0]).not.toHaveProperty('icon_url');
    expect(msg.embeds[0]).not.toHaveProperty('html_width');
    expect(msg.attachments.get('a1')).toMatchObject({
      id: 'a1',
      filename: 'x.png',
      size: 1,
      url: 'https://cdn.example/x.png',
      proxyUrl: 'https://cdn.example/x.png',
      contentType: null,
    });
  });
});

describe('Message.channel / member', () => {
  it('exposes send on the cached text channel and the cached member', () => {
    const client = createTestClient();
    const guild = new Guild(client, fixtureGuild({ id: 'g1' }));
    client.guilds.set(guild.id, guild);
    const channel = new TextChannel(client, fixtureTextChannel({ id: 'c1', guild_id: 'g1' }));
    client.channels.set(channel.id, channel);
    const member = new GuildMember(
      client,
      fixtureMember({ user: fixtureUser({ id: 'u1' }) }),
      guild,
    );
    guild.members.set(member.id, member);

    const msg = makeMessage(client, {
      channel_id: 'c1',
      guild_id: 'g1',
      author: fixtureUser({ id: 'u1' }),
    });
    expect(msg.channel).toBe(channel);
    expect(typeof msg.channel?.send).toBe('function');
    expect(typeof msg.channel?.delete).toBe('function');
    expect(msg.member).toBe(member);
  });
});

describe('Message.resolveChannel', () => {
  it('returns a Channel with delete and send', async () => {
    const client = createTestClient();
    const channel = new TextChannel(client, fixtureTextChannel({ id: 'c1', guild_id: 'g1' }));
    client.channels.set(channel.id, channel);
    const msg = makeMessage(client, { channel_id: 'c1', guild_id: 'g1' });
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);

    const resolved = await msg.resolveChannel();
    expect(resolved).toBe(channel);
    expect(typeof resolved.delete).toBe('function');
    expect(resolved.isTextBased()).toBe(true);
    if (!resolved.isTextBased()) throw new Error('expected text-capable channel');
    expect(typeof resolved.send).toBe('function');

    await resolved.delete();
    expect(del).toHaveBeenCalledWith(Routes.channel('c1'), { body: undefined, auth: true });
    expect(client.channels.get('c1')).toBeUndefined();
  });
});

describe('PartialMessage.resolveChannel', () => {
  it('returns a Channel with delete', async () => {
    const client = createTestClient();
    const channel = new TextChannel(client, fixtureTextChannel({ id: 'c1', guild_id: 'g1' }));
    client.channels.set(channel.id, channel);
    const partial = new PartialMessage(client, { id: 'm1', channelId: 'c1', guildId: 'g1' });
    const del = vi.spyOn(client.rest, 'delete').mockResolvedValue(undefined);

    const resolved = await partial.resolveChannel();
    await resolved.delete();
    expect(del).toHaveBeenCalledWith(Routes.channel('c1'), { body: undefined, auth: true });
  });
});

describe('Message.call / messageSnapshots', () => {
  it('maps call ended_timestamp to endedAt', () => {
    const msg = makeMessage(createMessageStubClient(), {
      call: { participants: ['u1'], ended_timestamp: '2026-01-01T00:00:00.000Z' },
    });
    expect(msg.call).toEqual({
      participants: ['u1'],
      endedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(msg.call).not.toHaveProperty('ended_timestamp');
  });

  it('maps snapshot snake_case fields to camelCase', () => {
    const msg = makeMessage(createMessageStubClient(), {
      message_snapshots: [
        {
          content: 'fwd',
          timestamp: '2026-01-01T00:00:00.000Z',
          edited_timestamp: null,
          mention_roles: ['r1'],
          attachments: [
            {
              id: 'a1',
              filename: 'x.png',
              size: 1,
              url: 'https://cdn.example/x.png',
              proxy_url: 'https://cdn.example/x.png',
            },
          ],
          embeds: [
            {
              type: 'rich',
              author: { name: 'Ada', icon_url: 'https://cdn.example/icon.png' },
            },
          ],
        },
      ],
    });
    expect(msg.messageSnapshots[0]).toMatchObject({
      content: 'fwd',
      mentionRoles: ['r1'],
      attachments: [{ id: 'a1', proxyUrl: 'https://cdn.example/x.png' }],
      embeds: [{ author: { name: 'Ada', iconUrl: 'https://cdn.example/icon.png' } }],
    });
    expect(msg.messageSnapshots[0]).not.toHaveProperty('mention_roles');
    expect(msg.messageSnapshots[0]).not.toHaveProperty('edited_timestamp');
  });
});

describe('Message.embeds camelCase', () => {
  it('maps snake_case wire fields to the read view', () => {
    const msg = makeMessage(createMessageStubClient(), {
      embeds: [
        {
          type: 'rich',
          title: 'Hello',
          timestamp: '2026-01-01T00:00:00.000Z',
          html_width: 640,
          html_height: 360,
          author: {
            name: 'Ada',
            icon_url: 'https://cdn.example/icon.png',
            proxy_icon_url: 'https://cdn.example/icon-proxy.png',
          },
          footer: {
            text: 'foot',
            icon_url: 'https://cdn.example/foot.png',
            proxy_icon_url: 'https://cdn.example/foot-proxy.png',
          },
          image: {
            url: 'https://cdn.example/img.png',
            proxy_url: 'https://cdn.example/img-proxy.png',
            content_type: 'image/png',
            content_hash: 'abc',
          },
        },
      ],
    });
    const embed = msg.embeds[0]!;
    expect(embed.timestamp).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(embed.htmlWidth).toBe(640);
    expect(embed.htmlHeight).toBe(360);
    expect(embed.author).toMatchObject({
      name: 'Ada',
      iconUrl: 'https://cdn.example/icon.png',
      proxyIconUrl: 'https://cdn.example/icon-proxy.png',
    });
    expect(embed.footer).toMatchObject({
      text: 'foot',
      iconUrl: 'https://cdn.example/foot.png',
    });
    expect(embed.image).toMatchObject({
      url: 'https://cdn.example/img.png',
      proxyUrl: 'https://cdn.example/img-proxy.png',
      contentType: 'image/png',
      contentHash: 'abc',
    });
    expect(embed).not.toHaveProperty('html_width');
    expect(embed.author).not.toHaveProperty('icon_url');
    expect(embed.image).not.toHaveProperty('proxy_url');
  });
});

describe('Message.flags / reactions / stickers / edit clear', () => {
  it('exposes MessageFlagsBitField', () => {
    const msg = makeMessage(createMessageStubClient(), { flags: 4 });
    expect(msg.flags).toBeInstanceOf(MessageFlagsBitField);
    expect(msg.flags.bitfield).toBe(4n);
  });

  it('wraps reactions and stickers as domain objects', () => {
    const msg = makeMessage(createMessageStubClient(), {
      reactions: [{ emoji: { name: '👍', id: null }, count: 2, me: true }],
      stickers: [{ id: 's1', name: 'wave', description: 'hi', tags: ['wave'], animated: false }],
    });
    expect(msg.reactions.size).toBe(1);
    const reaction = msg.reactions.cache.get('👍');
    expect(reaction?.count).toBe(2);
    expect(reaction?.me).toBe(true);
    expect(msg.stickers).toHaveLength(1);
    expect(msg.stickers[0]?.name).toBe('wave');
    expect(msg.stickers[0]?.id).toBe('s1');
  });

  it('edit sends embeds: [] and attachments: [] to clear', async () => {
    const client = createMessageStubClient();
    const msg = makeMessage(client);
    const patch = vi.spyOn(client.rest, 'patch').mockResolvedValue(
      fixtureMessage({
        id: 'm1',
        channel_id: 'c1',
        guild_id: 'g1',
        author: fixtureUser({ id: 'u1' }),
        content: 'hi',
        embeds: [],
        attachments: [],
      }),
    );

    await msg.edit({ embeds: [], attachments: [] });

    expect(patch).toHaveBeenCalledWith(Routes.channelMessage('c1', 'm1'), {
      body: { embeds: [], attachments: [] },
    });
  });
});
