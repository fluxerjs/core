import { describe, expect, it } from 'vitest';
import type { DocClass, DocEnum, DocInterface } from './doc-schema';
import { collapseTypeDisplay, previewFromSymbol, stripJsDocLinks } from './type-preview';

describe('collapseTypeDisplay', () => {
  it('keeps typeof queries', () => {
    expect(collapseTypeDisplay('typeof Routes')).toBe('typeof Routes');
  });

  it('collapses a huge object dump', () => {
    const keys = Array.from({ length: 12 }, (_, i) => `k${i}: (id: string) => string;`).join(' ');
    expect(collapseTypeDisplay(`{ ${keys} }`)).toBe('{ … }');
  });
});

describe('stripJsDocLinks', () => {
  it('keeps an explicit link label', () => {
    expect(stripJsDocLinks('See {@link Channel.fetchSlowmode fetchSlowmode}.')).toBe(
      'See fetchSlowmode.',
    );
  });

  it('uses the member name from Class#member', () => {
    expect(stripJsDocLinks('From {@link Channel#fetchSlowmode}.')).toBe('From fetchSlowmode.');
  });
});

describe('previewFromSymbol', () => {
  it('lists interface fields', () => {
    const symbol: DocInterface = {
      id: 'interface:ChannelSlowmodePayload',
      name: 'ChannelSlowmodePayload',
      kind: 'interface',
      description: 'CamelCase slowmode state from {@link Channel.fetchSlowmode}.',
      properties: [
        { name: 'rateLimitPerUser', type: 'number', optional: false },
        { name: 'retryAfterMs', type: 'number', optional: false },
      ],
    };
    const preview = previewFromSymbol(symbol);
    expect(preview.kind).toBe('interface');
    expect(preview.href).toBe('/docs/interface/ChannelSlowmodePayload/');
    expect(preview.description).toBe('CamelCase slowmode state from fetchSlowmode.');
    expect(preview.members).toEqual([
      { name: 'rateLimitPerUser', detail: 'number' },
      { name: 'retryAfterMs', detail: 'number' },
    ]);
    expect(preview.more).toBe(0);
  });

  it('caps long member lists', () => {
    const symbol: DocEnum = {
      id: 'enum:ChannelType',
      name: 'ChannelType',
      kind: 'enum',
      members: Array.from({ length: 14 }, (_, i) => ({ name: `M${i}`, value: i })),
    };
    const preview = previewFromSymbol(symbol);
    expect(preview.members).toHaveLength(10);
    expect(preview.more).toBe(4);
  });

  it('keeps one row per overloaded method name', () => {
    const symbol = {
      id: 'class:Client',
      name: 'Client',
      kind: 'class',
      constructor: undefined,
      properties: [],
      methods: [
        { name: 'bulkFetchMessages', params: [], returns: 'Promise<BulkFetchMessagesResult>' },
        {
          name: 'bulkFetchMessages',
          params: [{ name: 'options', type: 'BulkFetchMessagesOptions', optional: true }],
          returns: 'Promise<BulkFetchMessagesResult>',
        },
        { name: 'login', params: [], returns: 'Promise<this>' },
      ],
    } satisfies DocClass;
    const preview = previewFromSymbol(symbol);
    const names = preview.members.map((m) => m.name);
    expect(names).toEqual(['bulkFetchMessages()', 'login()']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('includes class methods after properties', () => {
    const symbol = {
      id: 'class:Channel',
      name: 'Channel',
      kind: 'class',
      constructor: undefined,
      properties: [{ name: 'id', type: 'string' }],
      methods: [{ name: 'delete', params: [], returns: 'Promise<void>' }],
    } satisfies DocClass;
    const preview = previewFromSymbol(symbol);
    expect(preview.members).toEqual([
      { name: 'id', detail: 'string' },
      { name: 'delete()', detail: 'Promise<void>' },
    ]);
  });
});
