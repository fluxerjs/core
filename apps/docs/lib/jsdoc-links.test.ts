import { describe, expect, it } from 'vitest';
import { parseJsDocLink } from './jsdoc-links';

const index = new Map([
  ['Channel', { href: '/docs/class/Channel/', name: 'Channel' }],
  ['ChannelManager', { href: '/docs/class/ChannelManager/', name: 'ChannelManager' }],
  ['FluxerError', { href: '/docs/class/FluxerError/', name: 'FluxerError' }],
]);

const ctx = { name: 'Channel', members: ['delete', 'send', 'isTextBased', 'isGuild'] };

describe('parseJsDocLink', () => {
  it('links a same-page method from a bare name', () => {
    expect(parseJsDocLink('delete', undefined, index, ctx)).toEqual({
      href: '#delete',
      label: 'delete',
    });
  });

  it('keeps Class.method in the label and hashes the member', () => {
    expect(parseJsDocLink('ChannelManager.fetch', undefined, index, ctx)).toEqual({
      href: '/docs/class/ChannelManager/#fetch',
      label: 'ChannelManager.fetch',
    });
  });

  it('accepts Class#method and shows the instance path', () => {
    expect(parseJsDocLink('Channel#send', undefined, index, ctx)).toEqual({
      href: '/docs/class/Channel/#send',
      label: 'channel.send',
    });
  });

  it('links a top-level symbol', () => {
    expect(parseJsDocLink('FluxerError', undefined, index, ctx)).toEqual({
      href: '/docs/class/FluxerError/',
      label: 'FluxerError',
    });
  });

  it('links Events.MessageCreate as an enum member', () => {
    const withEvents = new Map([
      ...index,
      ['Events', { href: '/docs/enum/Events/', name: 'Events' }],
    ]);
    expect(parseJsDocLink('Events.MessageCreate', undefined, withEvents)).toEqual({
      href: '/docs/enum/Events/#MessageCreate',
      label: 'Events.MessageCreate',
    });
  });

  it('links a site path', () => {
    expect(parseJsDocLink('/rest/', 'REST API reference', index, ctx)).toEqual({
      href: '/rest/',
      label: 'REST API reference',
    });
  });

  it('prefers a documented type over a same-page member with the same name', () => {
    const withRoutes = new Map([
      ...index,
      ['Routes', { href: '/docs/interface/Routes/', name: 'Routes' }],
    ]);
    const clientCtx = { name: 'Client', members: ['Routes', 'rest', 'login'] };
    expect(parseJsDocLink('Routes', undefined, withRoutes, clientCtx)).toEqual({
      href: '/docs/interface/Routes/',
      label: 'Routes',
    });
  });
});
