'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Boxes, Braces, Hash, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

export type SdkKind = 'class' | 'interface' | 'enum';

export interface SdkCatalogItem {
  id: string;
  name: string;
  pkg?: string;
  meta: string;
  keywords: string;
}

export interface SdkCatalogSection {
  kind: SdkKind;
  items: SdkCatalogItem[];
}

interface KindStyle {
  label: string;
  icon: LucideIcon;
}

const KIND: Record<SdkKind, KindStyle> = {
  class: { label: 'Classes', icon: Boxes },
  interface: { label: 'Interfaces', icon: Braces },
  enum: { label: 'Enums', icon: Hash },
};

export function SdkCatalog({
  sections,
  basePath,
}: {
  sections: SdkCatalogSection[];
  basePath: string;
}): React.ReactElement {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const hay = `${item.name} ${item.pkg ?? ''} ${item.meta} ${item.keywords}`.toLowerCase();
          return hay.includes(q);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [q, sections]);

  const total = filtered.reduce((n, s) => n + s.items.length, 0);

  return (
    <div>
      <div className="relative mb-10 max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by class or method (leaveGuild, ClientUser)…"
          className="h-10 border-border/80 bg-card/60 pl-9"
          aria-label="Filter SDK symbols"
        />
        {q ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {total} match{total === 1 ? '' : 'es'}
          </p>
        ) : null}
      </div>

      {q && total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No symbols match “{query.trim()}”. Try the header search for dotted paths like{' '}
          <span className="font-mono">client.user.leaveGuild</span>.
        </p>
      ) : null}

      <div className="space-y-14">
        {filtered.map((section) => {
          const style = KIND[section.kind];
          const Icon = style.icon;
          return (
            <section key={section.kind} id={section.kind} className="scroll-mt-24">
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-base font-semibold tracking-tight">{style.label}</h2>
                <p className="font-mono text-xs text-muted-foreground">{section.items.length}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => (
                  <SymbolCard
                    key={item.id}
                    kind={section.kind}
                    name={item.name}
                    pkg={item.pkg}
                    meta={item.meta}
                    basePath={basePath}
                    highlight={q ? matchedMember(item.keywords, q) : undefined}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function matchedMember(keywords: string, q: string): string | undefined {
  const names = keywords.split(/\s+/).filter(Boolean);
  return names.find((n) => n.toLowerCase().includes(q));
}

function SymbolCard({
  kind,
  name,
  pkg,
  meta,
  basePath,
  highlight,
}: {
  kind: SdkKind;
  name: string;
  pkg?: string;
  meta: string;
  basePath: string;
  highlight?: string;
}): React.ReactElement {
  const base = basePath.replace(/\/$/, '');
  const href = highlight ? `${base}/${kind}/${name}/#${highlight}` : `${base}/${kind}/${name}/`;
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col border border-border bg-card p-4 hover:bg-muted/40">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-sm font-semibold text-foreground">
          {name}
        </span>
        <ArrowUpRight
          className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono text-[11px]">{meta}</span>
        {pkg ? <span className="truncate font-mono">{pkg.replace('@fluxerjs/', '')}</span> : null}
        {highlight && highlight !== name ? (
          <span className="truncate font-mono text-primary">{highlight}</span>
        ) : null}
      </div>
    </Link>
  );
}
