'use client';

import { ArrowUpRight, ExternalLink, Heart, MessageCircleQuestion, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { FLUXER_INVITE_URL } from '@/lib/community';
import { GITHUB_REPO, githubSponsorsHref, pluutyHref } from '@/lib/site';
import { cn } from '@/lib/utils';
import { GitHubIcon } from './GitHubIcon';

/** Official Fluxer mark. https://thesvg.org/icon/fluxer */
export function FluxerAppIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0M8.79 12.471q-1.092 0-2.078.493-.975.493-1.586 1.575-.395.712-.52 1.726c-.078.626.448 1.135 1.079 1.135.645 0 1.128-.543 1.284-1.17q.133-.531.429-.844.568-.6 1.435-.6.58 0 1.061.289.482.279 1.254.954 1.178 1.038 2.078 1.51.9.46 1.993.461 1.093 0 2.079-.493.985-.492 1.596-1.575.404-.714.522-1.734c.072-.623-.455-1.127-1.083-1.127-.65 0-1.134.549-1.307 1.176a2.1 2.1 0 0 1-.382.774q-.535.665-1.468.665-.579 0-1.05-.279-.46-.29-1.264-.964-1.19-.996-2.09-1.479a4 4 0 0 0-1.982-.493M8.79 6q-1.092 0-2.078.493-.975.492-1.586 1.575-.395.712-.52 1.726c-.078.625.448 1.135 1.079 1.135.645 0 1.128-.543 1.284-1.17q.133-.533.429-.845.568-.6 1.435-.6.58 0 1.061.29.482.278 1.254.953 1.178 1.04 2.078 1.51.9.462 1.993.462t2.079-.493q.985-.493 1.596-1.575.404-.716.522-1.734c.072-.624-.455-1.127-1.083-1.127-.65 0-1.134.549-1.307 1.175a2.1 2.1 0 0 1-.382.775q-.535.664-1.468.664-.579 0-1.05-.278-.46-.29-1.264-.965-1.19-.996-2.09-1.478A4 4 0 0 0 8.79 6" />
    </svg>
  );
}

/** Header icon linking to the Fluxer community. */
export function FluxerInviteIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <a
      href={FLUXER_INVITE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Join Fluxer"
      title="Join Fluxer"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}>
      <FluxerAppIcon className="h-4 w-4" />
    </a>
  );
}

/** Community invite for homepage, guides, and examples. */
export function HelpCallout({ className }: { className?: string }): React.ReactElement {
  return (
    <a
      href={FLUXER_INVITE_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        className,
      )}>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FluxerAppIcon className="h-5 w-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-foreground">Questions?</span>
          <span className="mt-0.5 text-sm leading-5 text-muted-foreground">
            Join the Fluxer community for help with the SDK.
          </span>
        </span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-border bg-background px-3.5 text-sm font-medium text-foreground transition-colors group-hover:border-foreground/20 sm:self-center">
        Join Fluxer
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </span>
    </a>
  );
}

/** Floating corner help: Fluxer community, GitHub, donate. */
export function HelpFab(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    function onPointer(e: MouseEvent): void {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <div
        id={panelId}
        role="dialog"
        aria-label="Need help?"
        aria-hidden={!open}
        className={cn(
          'w-[min(100vw-2.5rem,18.5rem)] origin-bottom-right rounded-xl border border-border bg-card p-3 shadow-lg transition-all duration-200',
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0',
        )}>
        <div className="mb-2 px-1">
          <p className="text-sm font-medium text-foreground">Need help?</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Join Fluxer, open the repo, or donate.
          </p>
        </div>
        <div className="flex flex-col gap-0.5">
          <a
            href={FLUXER_INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FluxerAppIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Join Fluxer</span>
              <span className="block text-xs text-muted-foreground">Community support</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <GitHubIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">GitHub</span>
              <span className="block text-xs text-muted-foreground">fluxerjs/core</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </a>
          <a
            href={githubSponsorsHref('help_fab')}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Donate</span>
              <span className="block text-xs text-muted-foreground">GitHub Sponsors</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </a>
          <a
            href={pluutyHref('help_fab')}
            target="_blank"
            rel="noreferrer sponsored"
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#24ddaf]/15 ring-1 ring-[#24ddaf]/25">
              <Image
                src="/pluuty.png"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5"
                unoptimized
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Pluuty</span>
              <span className="block text-xs text-muted-foreground">Helps fund Fluxer.js</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </a>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close help' : 'Need help?'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md hover:bg-muted',
          open && 'bg-muted',
        )}>
        {open ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <MessageCircleQuestion className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
