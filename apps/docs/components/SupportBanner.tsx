'use client';

import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { pluutyHref } from '@/lib/site';
import { cn } from '@/lib/utils';

function PluutyMark({ className }: { className?: string }): React.ReactElement {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-border',
        className,
      )}>
      <Image
        src="/pluuty.png"
        alt=""
        width={20}
        height={20}
        className="h-full w-full"
        unoptimized
      />
    </span>
  );
}

/** Quiet masthead credit under the nav. The whole row is the sponsored link. */
export function SupportBanner(): React.ReactElement {
  return (
    <a
      href={pluutyHref('banner')}
      target="_blank"
      rel="noreferrer sponsored"
      aria-label="Pluuty helps fund Fluxer.js. Get Pluuty."
      className="group flex h-10 w-full flex-nowrap items-center gap-2.5 border-b border-border px-3 transition-colors hover:bg-muted/40 sm:gap-3 sm:px-4 lg:px-6">
      <PluutyMark className="h-5 w-5" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Sponsor
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] leading-none">
        <span className="font-medium text-foreground">Pluuty</span>
        <span className="hidden text-muted-foreground sm:inline"> helps fund Fluxer.js</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        Get Pluuty
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}

/** Compact header mark used while the credit strip is collapsed. */
export function PluutyChip({ className }: { className?: string }): React.ReactElement {
  return (
    <Tooltip disableHoverableContent={false}>
      <TooltipTrigger asChild>
        <a
          href={pluutyHref('header')}
          target="_blank"
          rel="noreferrer sponsored"
          aria-label="Pluuty helps fund Fluxer.js"
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
            className,
          )}>
          <PluutyMark className="h-[18px] w-[18px]" />
        </a>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="p-0">
        <div className="w-[16.5rem] p-3">
          <div className="flex items-center gap-2">
            <PluutyMark className="h-5 w-5" />
            <p className="text-sm font-medium text-foreground">Pluuty</p>
          </div>
          <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
            Helps fund Fluxer.js. All-in-one Fluxer bot: moderation, leveling, welcome, and more.
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-foreground">
            Get Pluuty
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
