import { describe, expect, it } from 'vitest';
import { hrefForVersion, parseSitePath } from './docs-version';

describe('hrefForVersion', () => {
  it('rewrites Guides and SDK', () => {
    expect(hrefForVersion('2.2.0', 'guides', undefined, undefined, 'installation')).toBe(
      '/guides/v/2.2.0/installation/',
    );
    expect(hrefForVersion('latest', 'docs', 'class', 'Client')).toBe('/docs/class/Client/');
  });

  it('stays on REST, examples, changelog, and home', () => {
    expect(hrefForVersion('2.2.0', 'other', undefined, undefined, undefined, '/rest/foo/')).toBe(
      '/rest/foo/',
    );
    expect(hrefForVersion('latest', 'other', undefined, undefined, undefined, '/examples/')).toBe(
      '/examples/',
    );
    expect(hrefForVersion('3.0.0', 'other', undefined, undefined, undefined, '/changelog')).toBe(
      '/changelog/',
    );
    expect(hrefForVersion('2.2.0', 'other', undefined, undefined, undefined, '/')).toBe('/');
  });
});

describe('parseSitePath', () => {
  it('treats REST as other', () => {
    expect(parseSitePath('/rest/getGateway/')).toEqual({ section: 'other', active: 'latest' });
  });
});
