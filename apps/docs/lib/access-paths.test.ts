import { describe, expect, it } from 'vitest';
import {
  buildAccessPathIndex,
  buildPathOwnerIndex,
  memberAccessPaths,
  outerTypeName,
  preferredPath,
  splitCamelCase,
} from './access-paths';
import type { DocClass, DocOutput } from './doc-schema';

function cls(name: string, opts: Omit<Partial<DocClass>, 'constructor'> = {}): DocClass {
  return {
    id: `class:${name}`,
    name,
    kind: 'class',
    properties: [],
    methods: [],
    ...opts,
  } as DocClass;
}

const docs: Pick<DocOutput, 'classes'> = {
  classes: [
    cls('Client', {
      properties: [
        { name: 'user', type: 'ClientUser | null' },
        { name: 'guilds', type: 'GuildManager' },
        { name: 'ws', type: 'WebSocketManager' },
        { name: 'uptime', type: 'number | null' },
      ],
      methods: [{ name: 'login', params: [], returns: 'Promise<void>' }],
    }),
    cls('ClientUser', {
      description: 'The logged-in bot/user (`client.user`).',
      extends: 'User',
      methods: [
        { name: 'leaveGuild', params: [], returns: 'Promise<void>' },
        { name: 'fetch', params: [], returns: 'Promise<this>' },
      ],
    }),
    cls('User', {
      methods: [{ name: 'avatarURL', params: [], returns: 'string | null' }],
    }),
    cls('Guild', {
      properties: [{ name: 'members', type: 'GuildMemberManager' }],
    }),
    cls('GuildMemberManager', {
      methods: [{ name: 'search', params: [], returns: 'Promise<GuildMemberSearchPayload>' }],
    }),
    cls('Message', {
      properties: [{ name: 'author', type: 'User' }],
    }),
    cls('WebSocketManager', {
      properties: [{ name: 'ping', type: 'number' }],
    }),
  ],
};

describe('outerTypeName', () => {
  it('strips null unions and generics', () => {
    expect(outerTypeName('ClientUser | null')).toBe('ClientUser');
    expect(outerTypeName('LimitedCollection<string, Role>')).toBe('LimitedCollection');
    expect(outerTypeName('string')).toBeUndefined();
    expect(outerTypeName('Promise<this>')).toBeUndefined();
  });
});

describe('access paths', () => {
  it('maps client.user to ClientUser', () => {
    const index = buildAccessPathIndex(docs);
    expect(index.classPaths.get('ClientUser')).toContain('client.user');
  });

  it('resolves client.user.leaveGuild', () => {
    const index = buildAccessPathIndex(docs);
    const paths = memberAccessPaths('ClientUser', 'leaveGuild', index, docs.classes);
    expect(paths).toContain('client.user.leaveGuild');
    expect(preferredPath(paths)).toBe('client.user.leaveGuild');
  });

  it('lets inherited User methods use client.user', () => {
    const index = buildAccessPathIndex(docs);
    const paths = memberAccessPaths('User', 'avatarURL', index, docs.classes);
    expect(paths).toContain('client.user.avatarURL');
    expect(paths).toContain('message.author.avatarURL');
  });

  it('does not attach parent-only paths to subclass methods', () => {
    const index = buildAccessPathIndex(docs);
    const paths = memberAccessPaths('ClientUser', 'leaveGuild', index, docs.classes);
    expect(paths.some((p) => p.startsWith('message.author.'))).toBe(false);
  });

  it('maps client.ws.ping', () => {
    const index = buildAccessPathIndex(docs);
    expect(index.classPaths.get('WebSocketManager')).toContain('client.ws');
    const paths = memberAccessPaths('WebSocketManager', 'ping', index, docs.classes);
    expect(paths).toContain('client.ws.ping');
    expect(preferredPath(paths)).toBe('client.ws.ping');
  });

  it('maps guild.members.search', () => {
    const index = buildAccessPathIndex(docs);
    const paths = memberAccessPaths('GuildMemberManager', 'search', index, docs.classes);
    expect(paths).toContain('guild.members.search');
  });

  it('maps instance paths back to owning classes', () => {
    const index = buildAccessPathIndex(docs);
    const owners = buildPathOwnerIndex(index);
    expect(owners.get('client')).toBe('Client');
    expect(owners.get('client.user')).toBe('ClientUser');
    expect(owners.get('guild.members')).toBe('GuildMemberManager');
  });

  it('splits camelCase for keyword search', () => {
    expect(splitCamelCase('leaveGuild')).toBe('leave guild');
  });

  it('does not treat client.channels.fetch as a Channel instance', () => {
    const withChannel: Pick<DocOutput, 'classes'> = {
      classes: [
        ...docs.classes,
        cls('Channel', {
          description:
            '`client.channels.fetch` and `message.resolveChannel` return this type; call delete / send here.',
          methods: [{ name: 'isDM', params: [], returns: 'boolean' }],
        }),
        cls('ChannelManager', {
          methods: [{ name: 'fetch', params: [], returns: 'Promise<Channel>' }],
        }),
      ],
    };
    const index = buildAccessPathIndex(withChannel);
    expect(index.classPaths.get('Channel')).toContain('channel');
    expect(index.classPaths.get('Channel')?.some((p) => p.endsWith('.fetch'))).toBe(false);
    const paths = memberAccessPaths('Channel', 'isDM', index, withChannel.classes);
    expect(preferredPath(paths)).toBe('channel.isDM');
    expect(paths.some((p) => p.includes('fetch.isDM') || p.includes('resolveChannel.isDM'))).toBe(
      false,
    );
  });

  it('does not invent Discord ghost class paths', () => {
    const index = buildAccessPathIndex({
      classes: [...docs.classes, cls('StageChannel')],
    });
    expect(index.classPaths.has('StageChannel')).toBe(false);
  });
});
