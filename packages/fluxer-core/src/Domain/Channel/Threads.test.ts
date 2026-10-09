import type { APIChannel } from '@fluxerjs/types';
import { ChannelType, ForumLayout, Routes } from '@fluxerjs/types';
import { describe, expect, it, vi } from 'vitest';
import { toChannelCreateBody } from '../../ClientCore/SdkOptions/index.js';
import { createTestClient, fixtureMessage, fixtureTextChannel } from '../../TestKit/Fixtures.js';
import { Channel, ForumChannel, MediaChannel, type TextChannel, ThreadChannel } from './index.js';

function fixtureThread(overrides: Partial<APIChannel> = {}): APIChannel {
  return {
    id: 't1',
    type: ChannelType.PublicThread,
    guild_id: 'g1',
    parent_id: 'c1',
    name: 'topic',
    thread_metadata: {
      archived: false,
      auto_archive_duration: 1440,
      archive_timestamp: '2024-01-01T00:00:00.000Z',
      create_timestamp: '2024-01-01T00:00:00.000Z',
      locked: false,
    },
    ...overrides,
  } as APIChannel;
}

describe('thread channels', () => {
  it('builds public, announcement, forum, and media channels', () => {
    const client = createTestClient();
    const thread = Channel.from(client, fixtureThread());
    const announcement = Channel.from(
      client,
      fixtureThread({ id: 't2', type: ChannelType.AnnouncementThread }),
    );
    const forum = Channel.from(
      client,
      fixtureTextChannel({ id: 'f1', type: ChannelType.GuildForum, name: 'posts' }),
    );
    const media = Channel.from(
      client,
      fixtureTextChannel({ id: 'm1', type: ChannelType.GuildMedia, name: 'gallery' }),
    );

    expect(thread).toBeInstanceOf(ThreadChannel);
    expect(thread.isThread()).toBe(true);
    expect(thread.isTextBased()).toBe(true);
    expect(thread.isText()).toBe(false);
    expect(announcement.isThread()).toBe(true);
    expect(forum).toBeInstanceOf(ForumChannel);
    expect(forum.isForum()).toBe(true);
    expect(forum.isTextBased()).toBe(false);
    expect(media).toBeInstanceOf(MediaChannel);
    expect(media.isMedia()).toBe(true);
  });

  it('starts a public thread from a text channel', async () => {
    const client = createTestClient();
    const channel = Channel.from(client, fixtureTextChannel({ id: 'c1' })) as TextChannel;
    const post = vi.spyOn(client.rest, 'post').mockResolvedValue(fixtureThread({ id: 't1' }));

    const thread = await channel.threads.create({ name: 'topic' });

    expect(post).toHaveBeenCalledWith(Routes.channelThreads('c1'), {
      body: { name: 'topic', type: ChannelType.PublicThread },
      auth: true,
    });
    expect(thread).toBeInstanceOf(ThreadChannel);
    expect(client.channels.get('t1')).toBe(thread);
  });

  it('starts an announcement thread from an announcement channel', async () => {
    const client = createTestClient();
    const channel = Channel.from(
      client,
      fixtureTextChannel({ id: 'c1', type: ChannelType.GuildAnnouncement }),
    ) as TextChannel;
    const post = vi
      .spyOn(client.rest, 'post')
      .mockResolvedValue(fixtureThread({ type: ChannelType.AnnouncementThread }));

    await channel.threads.create({ name: 'news' });

    expect(post.mock.calls[0]?.[1]).toMatchObject({
      body: { name: 'news', type: ChannelType.AnnouncementThread },
    });
  });

  it('rejects create on a forum and createPost on a text channel', async () => {
    const client = createTestClient();
    const forum = Channel.from(
      client,
      fixtureTextChannel({ id: 'f1', type: ChannelType.GuildForum }),
    ) as ForumChannel;
    const text = Channel.from(client, fixtureTextChannel({ id: 'c1' })) as TextChannel;

    await expect(forum.threads.create({ name: 'nope' })).rejects.toThrow(/createPost/);
    await expect(text.threads.createPost({ name: 'nope', message: 'hi' })).rejects.toThrow(
      /forum and media/,
    );
  });

  it('creates a forum post as a public thread with a starter message', async () => {
    const client = createTestClient();
    const forum = Channel.from(
      client,
      fixtureTextChannel({ id: 'f1', type: ChannelType.GuildForum }),
    ) as ForumChannel;
    const post = vi
      .spyOn(client.rest, 'post')
      .mockResolvedValue(fixtureThread({ parent_id: 'f1' }));

    const thread = await forum.threads.createPost({ name: 'hello', message: 'first' });

    expect(post).toHaveBeenCalledWith(
      Routes.channelThreads('f1'),
      expect.objectContaining({
        body: expect.objectContaining({
          name: 'hello',
          type: ChannelType.PublicThread,
          message: expect.objectContaining({ content: 'first' }),
        }),
        auth: true,
      }),
    );
    expect(thread.isThread()).toBe(true);
  });

  it('caches the starter message from a forum post', async () => {
    const client = createTestClient();
    const forum = Channel.from(
      client,
      fixtureTextChannel({ id: 'f1', type: ChannelType.GuildForum }),
    ) as ForumChannel;
    const message = fixtureMessage({ id: 'm9', channel_id: 't1', content: 'first' });
    vi.spyOn(client.rest, 'post').mockResolvedValue({ ...fixtureThread({ id: 't1' }), message });
    const cache = vi.spyOn(client, '_addMessageToCache');

    await forum.threads.createPost({ name: 'hello', message: 'first' });

    expect(cache).toHaveBeenCalledWith('t1', message);
  });

  it('edits forum settings and skips layout on media channels', async () => {
    const client = createTestClient();
    const forum = Channel.from(
      client,
      fixtureTextChannel({ id: 'f1', type: ChannelType.GuildForum }),
    ) as ForumChannel;
    const media = Channel.from(
      client,
      fixtureTextChannel({ id: 'm1', type: ChannelType.GuildMedia }),
    ) as MediaChannel;
    const patch = vi
      .spyOn(client.rest, 'patch')
      .mockImplementation(async () => fixtureTextChannel());

    await forum.edit({
      name: 'posts',
      availableTags: [{ id: 'tag1', name: 'Help', moderated: true }],
      defaultForumLayout: ForumLayout.List,
    });
    await media.edit({ name: 'gallery', defaultForumLayout: ForumLayout.Grid });

    expect(patch.mock.calls[0]?.[1]).toMatchObject({
      body: {
        name: 'posts',
        available_tags: [{ id: 'tag1', name: 'Help', moderated: true }],
        default_forum_layout: ForumLayout.List,
      },
    });
    const mediaCall = patch.mock.calls[1]?.[1] as { body: Record<string, unknown> } | undefined;
    const mediaBody = mediaCall?.body;
    expect(mediaBody).toEqual({ name: 'gallery' });
  });

  it('sends forum fields only when creating a forum or media channel', () => {
    expect(
      toChannelCreateBody({
        name: 'posts',
        type: ChannelType.GuildForum,
        availableTags: [{ name: 'Help' }],
        defaultForumLayout: ForumLayout.Grid,
        defaultReactionEmoji: { emojiName: '👋' },
      }),
    ).toEqual({
      name: 'posts',
      type: ChannelType.GuildForum,
      available_tags: [{ name: 'Help' }],
      default_forum_layout: ForumLayout.Grid,
      default_reaction_emoji: { emoji_name: '👋' },
    });
    expect(
      toChannelCreateBody({
        name: 'general',
        type: ChannelType.GuildText,
        availableTags: [{ name: 'Help' }],
        defaultForumLayout: ForumLayout.List,
      }),
    ).toEqual({ name: 'general', type: ChannelType.GuildText });
  });

  it('edits a thread with archive fields and not a topic', async () => {
    const client = createTestClient();
    const thread = Channel.from(client, fixtureThread()) as ThreadChannel;
    const patch = vi.spyOn(client.rest, 'patch').mockResolvedValue(
      fixtureThread({
        thread_metadata: {
          archived: true,
          auto_archive_duration: 1440,
          archive_timestamp: '2024-01-02T00:00:00.000Z',
          create_timestamp: '2024-01-01T00:00:00.000Z',
          locked: false,
        },
      }),
    );

    await thread.edit({ archived: true });

    const body = patch.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(body.body).toEqual({ archived: true });
    expect(body.body).not.toHaveProperty('topic');
    expect(thread.archived).toBe(true);
  });
});
