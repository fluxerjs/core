'use client';

import { Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';

export function MemberFilter({ enabled }: { enabled: boolean }): React.ReactElement | null {
  const [query, setQuery] = useState('');
  const inputId = useId();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-member-root]');
    if (!root) return;
    const needle = query.trim().toLowerCase();
    for (const el of root.querySelectorAll<HTMLElement>('[data-member]')) {
      const hay = el.dataset.member ?? '';
      el.hidden = Boolean(needle) && !hay.includes(needle);
    }
  }, [query]);

  if (!enabled) return null;

  return (
    <div className="relative mt-6 max-w-md">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={inputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter members on this page…"
        className="h-9 border-border/80 bg-card/60 pl-8 text-sm"
        aria-label="Filter members on this page"
      />
    </div>
  );
}
