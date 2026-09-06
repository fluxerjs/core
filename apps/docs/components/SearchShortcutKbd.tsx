'use client';

import { useEffect, useState } from 'react';
import { detectSearchShortcut } from '@/lib/search-shortcut';
import { cn } from '@/lib/utils';

export function SearchShortcutKbd({ className }: { className?: string }): React.ReactElement {
  const [label, setLabel] = useState<string>('Ctrl K');

  useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ??
      navigator.platform ??
      navigator.userAgent;
    setLabel(detectSearchShortcut(platform));
  }, []);

  return (
    <kbd className={cn('rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]', className)}>
      {label}
    </kbd>
  );
}
