'use client';

import { ChevronDown, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  href: string;
  label: string;
  badge?: string;
  active?: boolean;
  hint?: string;
  /** Extra text matched by the sidebar filter (method names, etc). */
  keywords?: string;
}

export interface SidebarGroup {
  id: string;
  label: string;
  icon?: ReactNode;
  items: SidebarItem[];
  defaultOpen?: boolean;
}

function SidebarLink({
  item,
  onNavigate,
}: {
  item: SidebarItem;
  onNavigate?: () => void;
}): React.ReactElement {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
        item.active
          ? 'bg-primary/15 font-medium text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}>
      {item.badge ? (
        <span
          className={cn(
            'w-11 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide',
            `method-${item.badge}`,
          )}>
          {item.badge}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function SidebarNav({
  title,
  groups,
  items,
  onNavigate,
}: {
  title: string;
  groups?: SidebarGroup[];
  items?: SidebarItem[];
  onNavigate?: () => void;
}): React.ReactElement {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!groups?.length) return undefined;
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            (i.badge?.toLowerCase().includes(q) ?? false) ||
            (i.hint?.toLowerCase().includes(q) ?? false) ||
            (i.keywords?.toLowerCase().includes(q) ?? false) ||
            g.label.toLowerCase().includes(q),
        ),
        defaultOpen: true,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const filteredItems = useMemo(() => {
    if (!items) return undefined;
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.hint?.toLowerCase().includes(q) ?? false) ||
        (i.keywords?.toLowerCase().includes(q) ?? false),
    );
  }, [items, q]);

  const flat = !filteredGroups?.length && !groups?.length;

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter classes, methods…"
          className="h-8 border-border/80 bg-background/60 pl-8 text-xs"
          aria-label={`Filter ${title}`}
        />
      </div>
      {flat || (!filteredGroups?.length && filteredItems) ? (
        <nav className="flex flex-col gap-0.5 pb-8">
          {(filteredItems ?? []).map((item) => (
            <SidebarLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
          {q && !(filteredItems?.length ?? 0) ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">No matches</p>
          ) : null}
        </nav>
      ) : (
        <nav className="flex flex-col gap-1 pb-8">
          {(filteredGroups ?? []).map((group) => {
            const hasActive = group.items.some((i) => i.active);
            return (
              <Collapsible key={group.id} defaultOpen={q ? true : (group.defaultOpen ?? hasActive)}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted [&[data-state=open]>svg]:rotate-180">
                  {group.icon}
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <span className="font-mono text-[10px] font-normal text-muted-foreground">
                    {group.items.length}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-0.5 space-y-0.5 pl-1">
                  {group.items.map((item) => (
                    <SidebarLink key={item.href} item={item} onNavigate={onNavigate} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {q && !(filteredGroups?.length ?? 0) ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">No matches</p>
          ) : null}
        </nav>
      )}
    </div>
  );
}

export function DocsSidebar({
  title,
  items,
  groups,
}: {
  title: string;
  items?: SidebarItem[];
  groups?: SidebarGroup[];
}): React.ReactElement {
  return (
    <aside
      data-docs-sidebar
      className="docs-sidebar sticky top-[var(--header-h)] z-20 hidden h-[calc(100vh-var(--header-h))] w-[var(--sidebar-w)] shrink-0 border-r border-border/80 bg-card lg:block">
      <div className="scrollbar-none h-full overflow-y-auto px-3 py-4">
        <SidebarNav title={title} items={items} groups={groups} />
      </div>
    </aside>
  );
}

export function PageShell({
  sidebar,
  sidebarTitle,
  sidebarItems,
  sidebarGroups,
  children,
  toc,
  wide = false,
}: {
  sidebar?: ReactNode;
  sidebarTitle?: string;
  sidebarItems?: SidebarItem[];
  sidebarGroups?: SidebarGroup[];
  children: ReactNode;
  toc?: ReactNode;
  /** Use full available width (indexes / explorers). Article pages keep a reading measure. */
  wide?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const hasNav = Boolean(sidebarTitle && (sidebarGroups?.length || sidebarItems?.length));
  const resolvedSidebar =
    sidebar ??
    (hasNav ? (
      <DocsSidebar title={sidebarTitle!} items={sidebarItems} groups={sidebarGroups} />
    ) : null);

  return (
    <div className="flex w-full">
      {resolvedSidebar}
      <div className="min-w-0 flex-1">
        {hasNav ? (
          <div className="sticky top-[var(--header-h)] z-30 border-b border-border/80 bg-background/90 px-[var(--content-pad)] py-2 backdrop-blur lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Menu className="!size-3.5" />
                  {sidebarTitle}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
                <SheetHeader className="border-b">
                  <SheetTitle>{sidebarTitle}</SheetTitle>
                </SheetHeader>
                <div className="scrollbar-none h-[calc(100%-4rem)] overflow-y-auto px-3 py-4">
                  <SidebarNav
                    title={sidebarTitle!}
                    items={sidebarItems}
                    groups={sidebarGroups}
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : null}
        <div className="flex min-w-0">
          <main className="min-w-0 flex-1 px-[var(--content-pad)] py-8 lg:py-10">
            <div
              className={cn(
                'docs-content w-full',
                wide ? 'max-w-none' : 'max-w-[min(100%,56rem)] xl:max-w-[min(100%,64rem)]',
              )}>
              {children}
            </div>
          </main>
          {toc ? (
            <aside className="scrollbar-none sticky top-[var(--header-h)] z-10 hidden h-[calc(100vh-var(--header-h))] w-56 shrink-0 overflow-y-auto py-8 pl-6 pr-4 xl:block">
              {toc}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
