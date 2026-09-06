import { describe, expect, it } from 'vitest';
import type { DocClass, DocEnum, DocOutput } from './doc-schema';
import { buildProseLinkIndex, extractProseIdentifier, resolveProseIdentifier } from './prose-links';

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

const docs: Pick<DocOutput, 'classes' | 'interfaces' | 'enums'> = {
  classes: [
    cls('Client', {
      properties: [
        { name: 'user', type: 'ClientUser | null' },
        { name: 'guilds', type: 'GuildManager' },
      ],
      methods: [{ name: 'login', params: [], returns: 'Promise<this>' }],
    }),
    cls('Channel', {
      methods: [
        { name: 'send', params: [], returns: 'Promise<Message>' },
        { name: 'isTextBased', params: [], returns: 'boolean' },
      ],
    }),
    cls('Message', {
      methods: [{ name: 'reply', params: [], returns: 'Promise<Message>' }],
    }),
    cls('Guild', {
      properties: [{ name: 'members', type: 'GuildMemberManager' }],
    }),
    cls('GuildMemberManager', {
      methods: [{ name: 'search', params: [], returns: 'Promise<unknown>' }],
    }),
    cls('ClientUser', {
      methods: [{ name: 'setPresence', params: [], returns: 'Promise<void>' }],
    }),
  ],
  interfaces: [],
  enums: [
    {
      id: 'enum:Events',
      name: 'Events',
      kind: 'enum',
      members: [
        { name: 'Ready', value: 'ready' },
        { name: 'MessageCreate', value: 'messageCreate' },
      ],
    } satisfies DocEnum,
  ],
};

const index = buildProseLinkIndex(docs);

describe('extractProseIdentifier', () => {
  it('strips call suffixes', () => {
    expect(extractProseIdentifier('client.login()')).toBe('client.login');
    expect(extractProseIdentifier('channel.send({ forward: { channelId, messageId } })')).toBe(
      'channel.send',
    );
    expect(extractProseIdentifier('guild.members.search({ query })')).toBe('guild.members.search');
  });

  it('keeps type and enum paths', () => {
    expect(extractProseIdentifier('Events.MessageCreate')).toBe('Events.MessageCreate');
    expect(extractProseIdentifier('Client#login')).toBe('Client#login');
    expect(extractProseIdentifier('EmbedBuilder')).toBe('EmbedBuilder');
  });

  it('skips packages and URLs', () => {
    expect(extractProseIdentifier('@fluxerjs/core')).toBeUndefined();
    expect(extractProseIdentifier('/guides/basic-bot/')).toBeUndefined();
  });
});

describe('resolveProseIdentifier', () => {
  it('links Client#login and client.login() to the Client method', () => {
    expect(resolveProseIdentifier('client.login()', index)).toEqual({
      href: '/docs/class/Client/#login',
      label: 'client.login',
    });
    expect(resolveProseIdentifier('Client#login', index)?.href).toBe('/docs/class/Client/#login');
  });

  it('links Events.MessageCreate to the Events enum member', () => {
    expect(resolveProseIdentifier('Events.MessageCreate', index)).toEqual({
      href: '/docs/enum/Events/#MessageCreate',
      label: 'Events.MessageCreate',
    });
  });

  it('links structure methods', () => {
    expect(resolveProseIdentifier('channel.send()', index)?.href).toBe('/docs/class/Channel/#send');
    expect(resolveProseIdentifier('message.reply', index)?.href).toBe('/docs/class/Message/#reply');
    expect(resolveProseIdentifier('guild.members.search({ query })', index)?.href).toBe(
      '/docs/class/GuildMemberManager/#search',
    );
  });

  it('does not invent a href for unknown names', () => {
    expect(resolveProseIdentifier('notARealThing', index)).toBeUndefined();
    expect(resolveProseIdentifier('@fluxerjs/core', index)).toBeUndefined();
  });
});
