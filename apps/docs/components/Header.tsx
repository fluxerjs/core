'use client';

import { Heart, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { sectionIndexHref, useDocsVersion } from '@/lib/docs-version';
import { detectSearchShortcut } from '@/lib/search-shortcut';
import { GITHUB_REPO, githubSponsorsHref, pluutyHref } from '@/lib/site';
import { cn } from '@/lib/utils';
import { FluxerInviteIcon } from './FluxerInvite';
import { FluxerLogo } from './FluxerLogo';
import { GitHubIcon } from './GitHubIcon';
import { PluutyChip } from './SupportBanner';
import { ThemeToggle } from './ThemeToggle';
import { VersionPicker } from './VersionPicker';

const NAV: {
  label: string;
  href: string;
  versioned?: 'guides' | 'docs';
}[] = [
  { label: 'Guides', href: '/guides/', versioned: 'guides' },
  { label: 'SDK', href: '/docs/', versioned: 'docs' },
  { label: 'REST', href: '/rest/' },
  { label: 'Examples', href: '/examples/' },
  { label: 'Changelog', href: '/changelog/' },
];

function navHref(item: (typeof NAV)[number], preferred: string): string {
  if (item.versioned) return sectionIndexHref(item.versioned, preferred);
  return item.href;
}

function navActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const base = href.replace(/\/$/, '');
  return pathname === href || pathname === `${base}/` || pathname.startsWith(`${base}/`);
}

export function SiteHeader({
  onOpenSearch,
  compact = false,
}: {
  onOpenSearch?: () => void;
  compact?: boolean;
}): React.ReactElement {
  const pathname = usePathname();
  const { preferred } = useDocsVersion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shortcut, setShortcut] = useState<string | null>(null);

  useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ??
      navigator.platform ??
      navigator.userAgent;
    setShortcut(detectSearchShortcut(platform));
  }, []);

  return (
    <header
      className={cn(
        'h-[3.75rem] border-b bg-transparent transition-[height,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
        compact ? 'h-12 border-transparent' : 'border-border/60',
      )}>
      <div
        className={cn(
          'mx-auto flex h-full w-full flex-nowrap items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6',
          compact && 'px-5 sm:px-6 lg:px-6',
        )}>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[min(100%,20rem)] flex-col p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                <FluxerLogo className="h-6 w-6" />
                Fluxer.js
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {NAV.map((item) => {
                const href = navHref(item, preferred);
                const active = navActive(
                  pathname,
                  item.versioned ? `/${item.versioned}` : item.href,
                );
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm',
                      active
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}>
                    {item.label}
                  </Link>
                );
              })}
              <a
                href={githubSponsorsHref('mobile_menu')}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                Support
              </a>
              <a
                href={pluutyHref('mobile_menu')}
                target="_blank"
                rel="noreferrer sponsored"
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                Pluuty
              </a>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
          <FluxerLogo className="h-6 w-6 shrink-0" />
          <span className={cn('truncate text-base', compact && 'hidden sm:inline')}>Fluxer.js</span>
        </Link>

        <VersionPicker className={cn(compact && 'hidden sm:inline-flex')} />

        <nav className="ml-1 hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => {
            const href = navHref(item, preferred);
            const active = navActive(pathname, item.versioned ? `/${item.versioned}` : item.href);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-sm',
                  compact && 'rounded-full',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            'ml-auto flex items-center gap-1 sm:gap-1.5',
            compact && '[&_a]:rounded-full [&_button]:rounded-full',
          )}>
          <button
            type="button"
            onClick={onOpenSearch}
            className={cn(
              'hidden h-8 w-full max-w-xs items-center gap-2 border border-border bg-background px-3 text-muted-foreground hover:border-foreground/20',
              compact ? 'rounded-full lg:flex lg:w-56' : 'rounded-md sm:flex md:w-64 lg:w-72',
            )}>
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm">Search</span>
            <kbd className="pointer-events-none ml-auto shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {shortcut ?? '\u00a0'}
            </kbd>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(compact ? 'inline-flex lg:hidden' : 'sm:hidden')}
            onClick={onOpenSearch}
            aria-label="Search">
            <Search />
          </Button>
          {compact ? <PluutyChip className="max-sm:hidden" /> : null}
          <a
            href={githubSponsorsHref('header')}
            target="_blank"
            rel="noreferrer"
            aria-label="Support Fluxer.js on GitHub Sponsors"
            title="Support Fluxer.js"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <Heart className="h-4 w-4" />
            <span className={cn('hidden sm:inline', compact && 'sm:hidden lg:inline')}>
              Support
            </span>
          </a>
          <FluxerInviteIcon />
          <Button variant="ghost" size="icon" asChild>
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" aria-label="GitHub">
              <GitHubIcon className="h-4 w-4" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
