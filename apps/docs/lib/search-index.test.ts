import { describe, expect, it } from 'vitest';
import type { DocClass, DocOutput } from './doc-schema';
import type { SearchIndexInput } from './search-index';
import { buildSearchItems } from './search-index';
import { rankSearchItems, scoreSearchItem } from './search-rank';

function cls(name: string, opts: Omit<Partial<DocClass>, 'constructor'> = {}): DocClass {
  return {
    id: `class:${name}`,
    name,
    kind: 'class',
    properties: [],
    methods: [],
    package: '@fluxerjs/core',
    ...opts,
  } as DocClass;
}

const api: DocOutput = {
  meta: { generator: 'test', version: '2', date: 0 },
  package: '@fluxerjs/core',
  classes: [
    cls('Client', {
      properties: [
        { name: 'user', type: 'ClientUser | null', description: 'Authenticated user' },
        { name: 'uptime', type: 'number | null', description: 'Milliseconds since readyAt' },
        { name: 'ws', type: 'WebSocketManager', description: 'Gateway WebSocket manager' },
      ],
      methods: [{ name: 'login', params: [], returns: 'Promise<string>' }],
    }),
    cls('WebSocketManager', {
      properties: [
        {
          name: 'ping',
          type: 'number',
          description: 'Last gateway heartbeat ACK latency (RTT) in milliseconds',
        },
      ],
    }),
    cls('ClientUser', {
      description: 'The logged-in bot/user (`client.user`).',
      methods: [
        {
          name: 'leaveGuild',
          params: [],
          returns: 'Promise<void>',
          description: 'DELETE /users/@me/guilds/{guild_id}',
        },
      ],
    }),
    cls('Channel', {
      methods: [
        { name: 'delete', params: [], returns: 'Promise<void>' },
        { name: 'send', params: [], returns: 'Promise<Message>' },
      ],
    }),
    cls('Message', {
      methods: [
        { name: 'reply', params: [], returns: 'Promise<Message>' },
        { name: 'resolveChannel', params: [], returns: 'Promise<Channel>' },
      ],
    }),
    cls('PartialMessage', {
      methods: [{ name: 'resolveChannel', params: [], returns: 'Promise<Channel>' }],
    }),
    cls('Interaction', {
      methods: [{ name: 'reply', params: [], returns: 'Promise<void>' }],
    }),
  ],
  interfaces: [],
  enums: [],
};

const input: SearchIndexInput = {
  api,
  guides: [
    {
      slug: 'upgrading-to-3',
      title: 'Upgrading to 3.0',
      description: 'Upgrade notes for 3.0',
      category: 'upgrading',
      body: 'PartialMessage and Channel.send after fetch.',
    },
    {
      slug: 'migration',
      title: 'Migrating to 2.0',
      description: '1.x to 2.0 rewrite notes',
      category: 'upgrading',
      body: 'Optional sudo on `client.user.leaveGuild`.',
    },
    {
      slug: 'where-do-i',
      title: 'Where do I…?',
      description: 'Task index for common bot jobs',
      category: 'getting-started',
      searchTerms: 'timeout voice text send forward preloadMessages searchMessages',
      body: '## Timeout a member\nUse `member.timeout`. See also `channel.send`.',
    },
  ],
  examples: [
    {
      slug: 'minimal-bot',
      title: 'Minimal bot',
      description: 'Tiny starter',
      file: 'minimal-bot.js',
    },
    {
      slug: 'ping-bot',
      title: 'Prefix-command bot: latency, embeds, DMs',
      description: 'REST round-trip !ping and !info',
      file: 'ping-bot.js',
    },
  ],
  rest: [
    {
      operationId: 'deleteUsersMeGuildsGuildId',
      method: 'delete',
      path: '/users/@me/guilds/{guild_id}',
      summary: 'Leave a guild',
    },
    {
      operationId: 'heartbeat_voice_presence',
      method: 'post',
      path: '/channels/{channel_id}/voice-presence/heartbeat',
      summary: 'Heartbeat voice presence',
    },
  ],
  changelog: [
    {
      version: '3.0.0',
      date: '2026-08-23',
      summary: 'DX overhaul with PartialMessage.',
      sections: [
        {
          title: 'Breaking Changes',
          items: [{ summary: 'MessageDelete is PartialMessage', detail: 'No edit or reply.' }],
        },
      ],
    },
  ],
};

describe('buildSearchItems', () => {
  it('indexes changelog versions and breaking-change bullets', () => {
    const items = buildSearchItems(input);
    const entry = items.find((i) => i.id === 'changelog:3.0.0');
    expect(entry?.kind).toBe('changelog');
    expect(entry?.href).toBe('/changelog/#3.0.0');
    expect(entry?.keywords).toContain('PartialMessage');
    expect(entry?.keywords).toContain('MessageDelete');
  });

  it('indexes dotted method paths', () => {
    const items = buildSearchItems(input);
    const leave = items.find((i) => i.id === 'method:ClientUser:leaveGuild');
    expect(leave).toBeDefined();
    expect(leave?.kind).toBe('method');
    expect(leave?.path).toBe('client.user.leaveGuild');
    expect(leave?.title).toBe('client.user.leaveGuild()');
    expect(leave?.href).toBe('/docs/class/ClientUser/#leaveGuild');
    expect(leave?.keywords).toContain('client.user.leaveGuild');
    expect(leave?.keywords).toContain('leave guild');
  });

  it('indexes client.user as a property', () => {
    const items = buildSearchItems(input);
    const prop = items.find((i) => i.id === 'property:Client:user');
    expect(prop?.path).toBe('client.user');
  });

  it('indexes client.uptime and client.ws.ping with latency aliases', () => {
    const items = buildSearchItems(input);
    const uptime = items.find((i) => i.id === 'property:Client:uptime');
    const ping = items.find((i) => i.id === 'property:WebSocketManager:ping');
    expect(uptime?.path).toBe('client.uptime');
    expect(uptime?.keywords).toContain('client.uptime');
    expect(ping?.path).toBe('client.ws.ping');
    expect(ping?.keywords).toContain('latency');
    expect(ping?.keywords).toContain('heartbeat');
    expect(ping?.keywords).toContain('client.ws.ping');
  });

  it('indexes Channel#delete and Message#reply with action keywords', () => {
    const items = buildSearchItems(input);
    const del = items.find((i) => i.id === 'method:Channel:delete');
    const reply = items.find((i) => i.id === 'method:Message:reply');
    const resolve = items.find((i) => i.id === 'method:Message:resolveChannel');
    const login = items.find((i) => i.id === 'method:Client:login');
    expect(del?.keywords).toContain('Channel#delete');
    expect(del?.keywords).toContain('delete channel');
    expect(reply?.keywords).toContain('Message#reply');
    expect(resolve?.keywords).toContain('resolveChannel');
    expect(login?.keywords).toContain('Client#login');
  });

  it('drops Discord ghost symbols', () => {
    const items = buildSearchItems(input);
    expect(items.some((i) => i.owner === 'Interaction' || i.name === 'Interaction')).toBe(false);
  });

  it('indexes guide searchTerms and headings', () => {
    const items = buildSearchItems(input);
    const guide = items.find((i) => i.id === 'guide:where-do-i');
    expect(guide?.keywords).toContain('timeout');
    expect(guide?.keywords).toContain('preloadMessages');
    expect(guide?.keywords).toContain('Timeout a member');
  });
});

describe('rankSearchItems', () => {
  it('ranks client.user.leaveGuild above the class', () => {
    const items = buildSearchItems(input);
    const ranked = rankSearchItems(
      'client.user.leaveGuild',
      items.map((item) => ({ item, score: 0.4 })),
    );
    expect(ranked[0]?.id).toBe('method:ClientUser:leaveGuild');
  });

  it('ranks leaveGuild as a method, not a class', () => {
    const items = buildSearchItems(input);
    const leave = items.find((i) => i.id === 'method:ClientUser:leaveGuild')!;
    const klass = items.find((i) => i.id === 'class:ClientUser')!;
    expect(scoreSearchItem('leaveGuild', leave)).toBeLessThan(scoreSearchItem('leaveGuild', klass));
  });

  it('ranks delete channel as Channel.delete', () => {
    const items = buildSearchItems(input);
    const ranked = rankSearchItems(
      'delete channel',
      items.map((item) => ({ item, score: 0.4 })),
    );
    expect(ranked[0]?.id).toBe('method:Channel:delete');
  });

  it('ranks reply, resolveChannel, and login on the real methods', () => {
    const items = buildSearchItems(input);
    const reply = items.find((i) => i.id === 'method:Message:reply')!;
    const resolve = items.find((i) => i.id === 'method:Message:resolveChannel')!;
    const login = items.find((i) => i.id === 'method:Client:login')!;
    const send = items.find((i) => i.id === 'method:Channel:send')!;
    expect(scoreSearchItem('reply', reply)).toBeLessThan(0.2);
    expect(scoreSearchItem('resolveChannel', resolve)).toBeLessThan(0.2);
    expect(scoreSearchItem('Client#login', login)).toBeLessThan(0.2);
    expect(scoreSearchItem('send', send)).toBeLessThan(scoreSearchItem('send', items[0]!));
  });

  it('ranks uptime, ping, latency, and heartbeat on client status APIs', () => {
    const items = buildSearchItems(input);
    const all = items.map((item) => ({ item, score: 0.4 }));
    expect(rankSearchItems('uptime', all)[0]?.id).toBe('property:Client:uptime');
    expect(rankSearchItems('ping', all)[0]?.id).toBe('property:WebSocketManager:ping');
    expect(rankSearchItems('latency', all)[0]?.id).toBe('property:WebSocketManager:ping');
    expect(rankSearchItems('heartbeat', all)[0]?.id).toBe('property:WebSocketManager:ping');
    expect(rankSearchItems('rtt', all)[0]?.id).toBe('property:WebSocketManager:ping');

    for (const q of ['uptime', 'ping', 'latency', 'heartbeat']) {
      const top = rankSearchItems(q, all)[0];
      expect(top?.kind).not.toBe('rest');
      expect(top?.kind).not.toBe('example');
    }
  });
});
