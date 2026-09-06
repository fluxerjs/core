'use client';

import { useEffect, useState } from 'react';
import type { TocHeading } from '@/components/OnPageToc';
import { cn } from '@/lib/utils';

function scrollMark(): number {
  if (typeof window === 'undefined') return 112;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return 112;
  const px = raw.endsWith('rem') ? value * 16 : value;
  return px + 12;
}

export function OnPageTocClient({
  headings,
}: {
  headings: TocHeading[];
}): React.ReactElement | null {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? '');

  useEffect(() => {
    if (!headings.length) return;

    const sync = (): void => {
      let current = headings[0]?.id ?? '';
      for (const heading of headings) {
        const el = document.getElementById(heading.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - scrollMark() <= 0) current = heading.id;
      }
      setActiveId(current);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-[13px] text-muted-foreground">On this page</p>
      <ul className="border-l border-border text-[13px]">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={() => setActiveId(heading.id)}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  '-ml-px block border-l py-1.5 leading-5 transition-colors',
                  heading.depth >= 3 ? 'pl-5' : 'pl-3',
                  active
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
