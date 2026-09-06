'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { TypePlain } from '@/components/TypePlain';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TypePreviewData } from '@/lib/type-preview';
import { cn } from '@/lib/utils';

function TypeDocLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  const router = useRouter();
  const go = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    router.push(href);
  };
  return (
    <a href={href} className={className} onMouseDown={go}>
      {children}
    </a>
  );
}

function TypePreviewCard({ preview }: { preview: TypePreviewData }): React.ReactElement {
  return (
    <div className="w-[22rem] max-w-[min(22rem,calc(100vw-2rem))]">
      <div className="border-b border-border px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {preview.kind}
        </p>
        <TypeDocLink
          href={preview.href}
          className="font-mono text-sm font-semibold leading-6 hover:underline">
          {preview.name}
        </TypeDocLink>
        {preview.description ? (
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{preview.description}</p>
        ) : null}
        {preview.signature ? (
          <TypePlain
            type={preview.signature}
            className="mt-1.5 block break-words font-mono text-[12px] leading-5 text-muted-foreground"
          />
        ) : null}
      </div>
      {preview.members.length ? (
        <ul className="max-h-64 overflow-y-auto px-3 py-2">
          {preview.members.map((member, i) => (
            <li
              key={`${member.name}:${member.detail}:${i}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-3 py-0.5 text-[12px] leading-5">
              <span className="truncate font-mono">{member.name}</span>
              {member.detail ? (
                <TypePlain
                  type={member.detail}
                  className="truncate text-right font-mono text-muted-foreground"
                />
              ) : null}
            </li>
          ))}
          {preview.more > 0 ? (
            <li className="pt-1 text-[11px] text-muted-foreground">+{preview.more} more</li>
          ) : null}
        </ul>
      ) : null}
      <div className="border-t border-border px-3 py-1.5">
        <TypeDocLink
          href={preview.href}
          className="text-[11px] text-sky-600 hover:underline dark:text-sky-400">
          Open type
        </TypeDocLink>
      </div>
    </div>
  );
}

export function TypeLink({
  href,
  preview,
  children,
  className,
}: {
  href: string;
  preview?: TypePreviewData;
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  const link = (
    <Link href={href} className={cn(className)}>
      {children}
    </Link>
  );
  if (!preview) return link;

  return (
    <Tooltip disableHoverableContent={false}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="top" align="start" className="pointer-events-auto p-0">
        <TypePreviewCard preview={preview} />
      </TooltipContent>
    </Tooltip>
  );
}
