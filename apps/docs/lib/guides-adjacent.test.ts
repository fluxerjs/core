import { describe, expect, it } from 'vitest';
import { adjacentGuides, type GuideMeta } from './guides';

function g(slug: string, category: string, order: number, title = slug): GuideMeta {
  return { slug, title, description: '', category, order };
}

describe('adjacentGuides', () => {
  const guides = [
    g('installation', 'getting-started', 0, 'Installation'),
    g('from-discordjs', 'other', 0, 'From discord.js'),
    g('upgrading-to-3', 'upgrading', 0, 'Upgrading to 3.0'),
    g('basic-bot', 'getting-started', 1, 'Basic bot'),
    g('events', 'popular', 10, 'Events'),
  ].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  it('stays inside Getting Started', () => {
    const { prev, next } = adjacentGuides(guides, 'installation');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('basic-bot');
  });

  it('does not jump to From discord.js or Upgrading', () => {
    const { prev, next } = adjacentGuides(guides, 'basic-bot');
    expect(prev?.slug).toBe('installation');
    expect(next).toBeNull();
  });
});
