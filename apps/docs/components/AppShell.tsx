'use client';

import { Command } from 'cmdk';
import Fuse from 'fuse.js';
import {
  BookOpen,
  Boxes,
  Braces,
  FileCode,
  Hash,
  History,
  Search,
  Server,
  SquareFunction,
  Variable,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DocsVersionProvider } from '@/lib/docs-version';
import type { SearchItem, SearchKind } from '@/lib/search-index';
import { rankSearchItems } from '@/lib/search-rank';
import { cn } from '@/lib/utils';
import { HelpFab } from './FluxerInvite';
import { ScrollToHash, pushDocsHref } from './ScrollToHash';
import { SiteChrome } from './SiteChrome';

const KIND_META: Record<SearchKind, { label: string; icon: typeof BookOpen; badge: string }> = {
  guide: {
    label: 'Guides',
    icon: BookOpen,
    badge: 'bg-muted text-foreground',
  },
  example: {
    label: 'Examples',
    icon: FileCode,
    badge: 'bg-muted text-foreground',
  },
  method: {
    label: 'Methods',
    icon: SquareFunction,
    badge: 'bg-muted text-foreground',
  },
  property: {
    label: 'Properties',
    icon: Variable,
    badge: 'bg-muted text-foreground',
  },
  class: {
    label: 'Classes',
    icon: Boxes,
    badge: 'bg-muted text-foreground',
  },
  interface: {
    label: 'Interfaces',
    icon: Braces,
    badge: 'bg-muted text-foreground',
  },
  enum: {
    label: 'Enums',
    icon: Hash,
    badge: 'bg-muted text-foreground',
  },
  rest: {
    label: 'REST',
    icon: Server,
    badge: 'bg-muted text-foreground',
  },
  changelog: {
    label: 'Changelog',
    icon: History,
    badge: 'bg-muted text-foreground',
  },
};

const KIND_ORDER: SearchKind[] = [
  'guide',
  'example',
  'method',
  'property',
  'class',
  'interface',
  'enum',
  'rest',
  'changelog',
];

const EMPTY_QUERY_KINDS: SearchKind[] = ['guide', 'example', 'class', 'rest', 'changelog'];

export function AppShell({
  children,
  searchItems,
  latest,
  versions,
}: {
  children: React.ReactNode;
  searchItems: SearchItem[];
  latest: string;
  versions: string[];
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Hide the page scrollbar everywhere except REST routes, which are long/scroll-heavy.
    const showScrollbar = pathname?.startsWith('/rest') ?? false;
    document.documentElement.classList.toggle('hide-scrollbar', !showScrollbar);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <DocsVersionProvider latest={latest} versions={versions}>
      <div className="flex min-h-screen flex-col">
        <SiteChrome onOpenSearch={() => setOpen(true)} />
        <ScrollToHash />
        <div className="flex-1">{children}</div>
        <HelpFab />
        <SearchCommand open={open} onOpenChange={setOpen} items={searchItems} />
      </div>
    </DocsVersionProvider>
  );
}

function SearchCommand({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: SearchItem[];
}): React.ReactElement {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [kindFilter, setKindFilter] = useState<SearchKind | 'all'>('all');

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: 'path', weight: 0.3 },
          { name: 'name', weight: 0.25 },
          { name: 'title', weight: 0.2 },
          { name: 'keywords', weight: 0.15 },
          { name: 'owner', weight: 0.05 },
          { name: 'description', weight: 0.05 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
        includeScore: true,
        shouldSort: true,
        minMatchCharLength: 1,
      }),
    [items],
  );

  const results = useMemo(() => {
    const q = deferredQuery.trim();
    let list: SearchItem[];
    if (!q) {
      list = items.filter((i) => EMPTY_QUERY_KINDS.includes(i.kind)).slice(0, 48);
    } else {
      list = rankSearchItems(
        q,
        fuse.search(q, { limit: 240 }).map((r) => ({ item: r.item, score: r.score })),
      ).slice(0, 80);
    }
    if (kindFilter !== 'all') {
      list = list.filter((i) => i.kind === kindFilter);
    }
    return list;
  }, [deferredQuery, fuse, items, kindFilter]);

  const grouped = useMemo(() => {
    const hasQuery = Boolean(deferredQuery.trim());
    if (hasQuery) {
      return [{ kind: results[0]?.kind ?? ('method' as SearchKind), items: results, flat: true }];
    }
    const map = new Map<SearchKind, SearchItem[]>();
    for (const item of results) {
      const bucket = map.get(item.kind) ?? [];
      bucket.push(item);
      map.set(item.kind, bucket);
    }
    return KIND_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((k) => ({
      kind: k,
      items: map.get(k)!,
      flat: false,
    }));
  }, [deferredQuery, results]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setKindFilter('all');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-2xl [&>button]:hidden">
        <Command shouldFilter={false} className="bg-transparent">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search client.user.leaveGuild, guides, REST…"
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline">
              ESC
            </kbd>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
            <KindChip
              active={kindFilter === 'all'}
              onClick={() => setKindFilter('all')}
              label="All"
            />
            {KIND_ORDER.map((k) => (
              <KindChip
                key={k}
                active={kindFilter === k}
                onClick={() => setKindFilter(kindFilter === k ? 'all' : k)}
                label={KIND_META[k].label}
                className={kindFilter === k ? KIND_META[k].badge : undefined}
              />
            ))}
          </div>

          <Command.List className="scrollbar-none max-h-[min(70vh,32rem)] overflow-y-auto p-2">
            {results.length === 0 ? (
              <Command.Empty className="py-12 text-center text-sm text-muted-foreground">
                No results for “{query.trim()}”.
              </Command.Empty>
            ) : (
              grouped.map((group) => {
                return (
                  <Command.Group
                    key={group.flat ? 'top' : group.kind}
                    heading={group.flat ? 'Best matches' : KIND_META[group.kind].label}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground">
                    {group.items.map((item) => {
                      const itemMeta = KIND_META[item.kind];
                      const ItemIcon = itemMeta.icon;
                      return (
                        <Command.Item
                          key={item.id}
                          value={`${item.kind}-${item.title}-${item.id}`}
                          onSelect={() => {
                            onOpenChange(false);
                            pushDocsHref(item.href, (href) => router.push(href));
                          }}
                          className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground">
                          <span
                            className={cn(
                              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                              itemMeta.badge,
                            )}>
                            <ItemIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 font-medium">
                              <span className="truncate font-mono text-[13px]">{item.title}</span>
                              {item.owner ? (
                                <span className="truncate font-mono text-[10px] text-muted-foreground">
                                  {item.owner}
                                </span>
                              ) : item.package ? (
                                <span className="truncate font-mono text-[10px] text-muted-foreground">
                                  {item.package.replace('@fluxerjs/', '')}
                                </span>
                              ) : null}
                            </span>
                            {item.description ? (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                );
              })
            )}
          </Command.List>

          <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              {results.length} result{results.length === 1 ? '' : 's'}
              {deferredQuery.trim() ? ` for “${deferredQuery.trim()}”` : ''}
            </span>
            <span className="hidden sm:inline">↑↓ navigate · ↵ open</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function KindChip({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
        active
          ? (className ?? 'border-transparent bg-primary/15 text-primary')
          : 'border-border text-muted-foreground hover:text-foreground',
      )}>
      {label}
    </button>
  );
}
