import { computed, type ComputedRef } from 'vue';
import { DocOutput } from '../types/doc-schema';
import type { Guide } from '../data/guides';

export interface SearchHit {
  id: string;
  name: string;
  type: 'class' | 'interface' | 'enum' | 'method' | 'property' | 'member' | 'guide';
  path: { name: string; params?: Record<string, string>; hash?: string };
  parent?: string;
  /** Searchable text from full page content (guides) or descriptions (API) */
  searchText?: string;
}

function buildIndex(doc: DocOutput | null): SearchHit[] {
  if (!doc) return [];

  const hits: SearchHit[] = [];

  for (const c of doc.classes ?? []) {
    const classSearchText = [c.name, c.description].filter(Boolean).join(' ');
    hits.push({
      id: `class-${c.name}`,
      name: c.name,
      type: 'class',
      path: { name: 'class', params: { class: c.name } },
      searchText: classSearchText,
    });
    for (const m of c.methods ?? []) {
      hits.push({
        id: `method-${c.name}-${m.name}`,
        name: m.name,
        type: 'method',
        parent: c.name,
        path: { name: 'class', params: { class: c.name }, hash: `#method-${m.name}` },
        searchText: [m.name, m.description].filter(Boolean).join(' '),
      });
    }
    for (const p of c.properties ?? []) {
      hits.push({
        id: `prop-${c.name}-${p.name}`,
        name: p.name,
        type: 'property',
        parent: c.name,
        path: { name: 'class', params: { class: c.name }, hash: `#property-${p.name}` },
        searchText: [p.name, p.description].filter(Boolean).join(' '),
      });
    }
  }

  for (const i of doc.interfaces ?? []) {
    const ifaceSearchText = [i.name, i.description].filter(Boolean).join(' ');
    hits.push({
      id: `interface-${i.name}`,
      name: i.name,
      type: 'interface',
      path: { name: 'typedef', params: { typedef: i.name } },
      searchText: ifaceSearchText,
    });
    for (const p of i.properties ?? []) {
      hits.push({
        id: `iprop-${i.name}-${p.name}`,
        name: p.name,
        type: 'property',
        parent: i.name,
        path: { name: 'typedef', params: { typedef: i.name } },
        searchText: [p.name, p.description].filter(Boolean).join(' '),
      });
    }
  }

  for (const e of doc.enums ?? []) {
    const enumSearchText = [e.name, e.description].filter(Boolean).join(' ');
    hits.push({
      id: `enum-${e.name}`,
      name: e.name,
      type: 'enum',
      path: { name: 'typedef', params: { typedef: e.name } },
      searchText: enumSearchText,
    });
    for (const m of e.members ?? []) {
      hits.push({
        id: `member-${e.name}-${m.name}`,
        name: m.name,
        type: 'member',
        parent: e.name,
        path: { name: 'typedef', params: { typedef: e.name } },
        searchText: m.name,
      });
    }
  }

  return hits;
}

export function useSearchIndex(doc: { currentDoc: DocOutput | null }): ComputedRef<SearchHit[]> {
  return computed(() => buildIndex(doc.currentDoc));
}

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  'sending-messages': 'Sending Messages',
  media: 'Media',
  channels: 'Channels',
  emojis: 'Emojis',
  webhooks: 'Webhooks',
  voice: 'Voice',
  events: 'Events',
  other: 'Other',
};

function buildGuideSearchText(g: Guide): string {
  const parts: string[] = [g.title, g.description ?? ''];
  for (const s of g.sections ?? []) {
    if (s.title) parts.push(s.title);
    if (s.description) parts.push(s.description);
    if (s.code) parts.push(s.code);
    if (s.tip) parts.push(s.tip);
    if (s.alternateCode) {
      parts.push(s.alternateCode.label);
      if (s.alternateCode.code) parts.push(s.alternateCode.code);
    }
    if (s.table) {
      parts.push(...s.table.headers);
      for (const row of s.table.rows) parts.push(...row);
    }
  }
  return parts.filter(Boolean).join(' ');
}

export function useGuidesSearchIndex(guides: { guides: Guide[] }): ComputedRef<SearchHit[]> {
  return computed(() => {
    const list = guides.guides;
    if (!list?.length) return [];
    return list.map((g) => ({
      id: `guide-${g.slug}`,
      name: g.title,
      type: 'guide' as const,
      path: { name: 'guide', params: { slug: g.slug } },
      parent: CATEGORY_LABELS[g.category] ?? g.category,
      searchText: buildGuideSearchText(g),
    }));
  });
}
