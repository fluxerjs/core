import { describe, it } from 'vitest';
import type { Guild } from '../structures/Guild.js';
import type { Message } from '../structures/Message.js';
import type { GuildMembersChunkPayload } from './eventPayloads.js';
import { Client } from './Client.js';
import { Events } from '../util/Events.js';

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

    client.emit(Events.MessageDeleteBulk, { ids: ['1', '2'], channelId: '3', guildId: null });
    client.emit(Events.Ready);

    // @ts-expect-error MessageCreate listeners receive exactly one message arg
    client.on(Events.MessageCreate, (_message, _extra) => {});
  });
});
