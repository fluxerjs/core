import { describe, it } from 'vitest';
import type { Channel, GuildChannel } from '../Domain/Channel/index.js';
import type { Guild } from '../Domain/Guild/Guild.js';
import type { GuildMember } from '../Domain/Guild/GuildMember.js';
import type { PartialGuildMember } from '../Domain/Guild/PartialGuildMember.js';
import type { Message } from '../Domain/Message/index.js';
import type { PartialMessage } from '../Domain/Message/PartialMessage.js';
import type { User } from '../Domain/User.js';
import { Events } from '../Helpers/Events.js';
import { Client } from './Client.js';
import type { GuildMembersChunkPayload } from './EventPayloads.js';

type IsAny<T> = 0 extends 1 & T ? true : false;
type Assert<T extends true> = T;
type IsExactly<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('Client event typings (compile-time)', () => {
  it('listener args match ClientEvents', () => {
    const client = new Client();

    client.on(Events.MessageCreate, (message) => {
      type _notAny = Assert<IsAny<typeof message> extends false ? true : false>;
      type _exact = Assert<IsExactly<typeof message, Message>>;
      const _messageId: string = message.id;
      const _send = message.channel?.send;
      const _delete = message.channel?.delete;
      const _member = message.member;
      void _send;
      void _delete;
      void _member;

      void (async () => {
        const fetched = await client.channels.fetch('c1');
        type _fetchDelete = Assert<IsExactly<(typeof fetched)['delete'], Channel['delete']>>;
        await fetched.delete();
        if (fetched.isTextBased()) {
          await fetched.send('hi');
        }

        const resolved = await message.resolveChannel();
        type _resolveDelete = Assert<IsExactly<(typeof resolved)['delete'], Channel['delete']>>;
        await resolved.delete();
        if (resolved.isTextBased()) {
          await resolved.send('hi');
        }
      });
    });

    client.on(Events.MessageDelete, (message) => {
      type _notAny = Assert<IsAny<typeof message> extends false ? true : false>;
      type _exact = Assert<IsExactly<typeof message, PartialMessage>>;
      const _authorId: string | null = message.authorId;
      const _author: User | null = message.author;
      const _createdAt: Date | null = message.createdAt;
      const _partial: true = message.partial;
      const _resolve = message.resolveChannel;
      const _fetch = message.fetch;
      void _authorId;
      void _author;
      void _createdAt;
      void _partial;
      void _resolve;
      void _fetch;
    });

    client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
      type _old = Assert<IsExactly<typeof oldMessage, Message | null>>;
      type _new = Assert<IsExactly<typeof newMessage, Message | PartialMessage>>;
      if (newMessage.partial) {
        const _authorId: string | null = newMessage.authorId;
        void _authorId;
      } else {
        const _edit = newMessage.edit;
        const _author: User = newMessage.author;
        void _edit;
        void _author;
      }
      void oldMessage;
    });

    client.on(Events.GuildMemberRemove, (member) => {
      type _exact = Assert<IsExactly<typeof member, GuildMember | PartialGuildMember>>;
      const _user: User = member.user;
      const _guild: Guild = member.guild;
      void _user;
      void _guild;
      if (!member.partial) {
        const _joined: Date = member.joinedAt;
        void _joined;
      }
    });

    client.on(Events.GuildMembersChunk, (chunk) => {
      type _notAny = Assert<IsAny<typeof chunk> extends false ? true : false>;
      type _exact = Assert<IsExactly<typeof chunk, GuildMembersChunkPayload>>;
      const _guildId: string = chunk.guildId;
    });

    client.on(Events.GuildUnavailable, (guild) => {
      type _notAny = Assert<IsAny<typeof guild> extends false ? true : false>;
      type _exact = Assert<IsExactly<typeof guild, Guild>>;
      const _available: boolean = guild.available;
    });

    client.on(Events.GuildAvailable, (guild) => {
      type _exact = Assert<IsExactly<typeof guild, Guild>>;
      const _guildId: string = guild.id;
    });

    client.on(Events.ChannelCreate, (channel) => {
      type _exact = Assert<IsExactly<typeof channel, Channel>>;
      const _delete: Channel['delete'] = channel.delete;
      void _delete;
      if (channel.isGuild()) {
        const _edit: GuildChannel['edit'] = channel.edit;
        void _edit;
      }
      if (channel.isTextBased()) {
        const _send = channel.send;
        void _send;
      }
    });

    client.on(Events.MessageReactionAdd, (payload) => {
      const _reply = payload.message?.reply;
      const _fetch = payload.reaction.fetchMessage;
      void _reply;
      void _fetch;
    });

    client.emit(Events.MessageDeleteBulk, {
      ids: ['1', '2'],
      channelId: '3',
      guildId: null,
      channel: null,
      messages: [],
    });
    client.emit(Events.Ready);

    // @ts-expect-error MessageCreate listeners receive exactly one message arg
    client.on(Events.MessageCreate, (_message, _extra) => {});
  });
});
