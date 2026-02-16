import { computed, type ComputedRef } from 'vue';
import type { DocOutput } from '../types/doc-schema';
import type { Guide } from '../data/guides';

export interface SearchHit {
  id: string;
  name: string;
  type: 'class' | 'interface' | 'enum' | 'method' | 'property' | 'member' | 'guide';
  path: { name: string; params?: Record<string, string>; hash?: string };
  parent?: string;
}

function buildIndex(doc: DocOutput | null): SearchHit[] {
  if (!doc) return [];

  const hits: SearchHit[] = [];

  for (const c of doc.classes ?? []) {
    hits.push({
      id: `class-${c.name}`,
      name: c.name,
      type: 'class',
      path: { name: 'class', params: { class: c.name } },
    });
    for (const m of c.methods ?? []) {
      hits.push({
        id: `method-${c.name}-${m.name}`,
        name: m.name,
        type: 'method',
        parent: c.name,
        path: { name: 'class', params: { class: c.name }, hash: `#method-${m.name}` },
      });
    }
    for (const p of c.properties ?? []) {
      hits.push({
        id: `prop-${c.name}-${p.name}`,
        name: p.name,
        type: 'property',
        parent: c.name,
        path: { name: 'class', params: { class: c.name }, hash: `#property-${p.name}` },
      });
    }
  }

  for (const i of doc.interfaces ?? []) {
    hits.push({
      id: `interface-${i.name}`,
      name: i.name,
      type: 'interface',
      path: { name: 'typedef', params: { typedef: i.name } },
    });
    for (const p of i.properties ?? []) {
      hits.push({
        id: `iprop-${i.name}-${p.name}`,
        name: p.name,
        type: 'property',
        parent: i.name,
        path: { name: 'typedef', params: { typedef: i.name } },
      });
    }
  }

  for (const e of doc.enums ?? []) {
    hits.push({
      id: `enum-${e.name}`,
      name: e.name,
      type: 'enum',
      path: { name: 'typedef', params: { typedef: e.name } },
    });
    for (const m of e.members ?? []) {
      hits.push({
        id: `member-${e.name}-${m.name}`,
        name: m.name,
        type: 'member',
        parent: e.name,
        path: { name: 'typedef', params: { typedef: e.name } },
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
  webhooks: 'Webhooks',
  voice: 'Voice',
  'sending-messages': 'Sending Messages',
  media: 'Media',
  events: 'Events',
  other: 'Other',
};

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
    }));
  });
}
