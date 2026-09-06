'use client';

import { useEffect, useState } from 'react';
import { DownloadsChart } from '@/components/DownloadsChart';
import {
  formatDownloadCount,
  formatDownloadExact,
  loadNpmDownloadStats,
  type NpmDownloadStats,
} from '@/lib/npm-downloads';

export function DownloadsStatClient({
  initial,
}: {
  initial: NpmDownloadStats;
}): React.ReactElement {
  const [stats, setStats] = useState<NpmDownloadStats>(initial);

  useEffect(() => {
    let cancelled = false;
    void loadNpmDownloadStats('default').then((fresh) => {
      if (!cancelled && fresh) setStats(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-[var(--content-pad)] py-12 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              npm downloads
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight">Adoption at a glance</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Across{' '}
            <span className="font-medium text-foreground tabular-nums">{stats.packageCount}</span>{' '}
            published packages
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="grid gap-px bg-border sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-1">
              <Stat
                label="Total installs"
                value={formatDownloadCount(stats.total)}
                exact={formatDownloadExact(stats.total)}
                emphasis
              />
              <Stat
                label="Last 30 days"
                value={formatDownloadCount(stats.last30)}
                exact={formatDownloadExact(stats.last30)}
              />
            </div>
            <div className="flex flex-col bg-card p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Weekly downloads
              </p>
              <div className="mt-3 flex-1">
                <DownloadsChart series={stats.series} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  exact,
  emphasis,
}: {
  label: string;
  value: string;
  exact: string;
  emphasis?: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-col justify-center bg-card p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          emphasis
            ? 'mt-1.5 text-4xl font-semibold tracking-tight tabular-nums text-foreground sm:text-5xl'
            : 'mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground sm:text-3xl'
        }
        title={exact}>
        {value}
      </p>
    </div>
  );
}
