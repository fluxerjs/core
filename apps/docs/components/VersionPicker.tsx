'use client';

import { Check, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { hrefForVersion, parseSitePath, useDocsVersion } from '@/lib/docs-version';
import { cn } from '@/lib/utils';

export interface VersionPickerProps {
  className?: string;
}

export function VersionPicker({ className }: VersionPickerProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const { latest, versions, preferred, setPreferred, displayVersion } = useDocsVersion();
  const { section, kind, name, guideSlug } = parseSitePath(pathname);

  const options: { value: string; label: string; isLatest: boolean }[] = [
    { value: 'latest', label: latest, isLatest: true },
    ...versions.filter((v) => v !== latest).map((v) => ({ value: v, label: v, isLatest: false })),
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md border border-border/80 bg-card/70 px-2 font-mono text-xs font-medium text-foreground outline-none transition-colors',
            'hover:border-border hover:bg-card',
            'focus-visible:ring-2 focus-visible:ring-ring',
            'data-[state=open]:border-border data-[state=open]:bg-card',
            className,
          )}
          aria-label="SDK version">
          <span>v{displayVersion}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={6} className="min-w-[9.5rem]">
        {options.map((o, i) => {
          const selected = o.value === preferred;
          return (
            <div key={o.value}>
              {i === 1 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onSelect={() => {
                  setPreferred(o.value);
                  router.push(
                    hrefForVersion(o.value, section, kind, name, guideSlug, pathname ?? undefined),
                  );
                }}
                className={cn(
                  'cursor-pointer justify-between gap-4 font-mono text-xs',
                  selected && 'bg-accent',
                )}>
                <span className="flex items-center gap-2">
                  <span>v{o.label}</span>
                  {o.isLatest ? (
                    <span className="font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      latest
                    </span>
                  ) : null}
                </span>
                {selected ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
