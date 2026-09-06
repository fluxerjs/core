'use client';

import { useId, useMemo, useState } from 'react';
import { type DailyDownloads, formatDownloadCount, formatDownloadExact } from '@/lib/npm-downloads';
import { cn } from '@/lib/utils';

const WIDTH = 640;
const HEIGHT = 176;
const PAD = { top: 16, right: 8, bottom: 8, left: 8 };
const GRID_LINES = 3;

export function DownloadsChart({
  series,
  className,
}: {
  series: DailyDownloads[];
  className?: string;
}): React.ReactElement | null {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const layout = useMemo(() => layoutPoints(series), [series]);
  if (layout.points.length === 0) return null;

  const { points, max } = layout;
  const hover = active === null ? null : (points[active] ?? null);
  const start = points[0];
  const end = points[points.length - 1];
  const mid = points[Math.floor(points.length / 2)];
  const baseline = HEIGHT - PAD.bottom;

  return (
    <div className={cn('relative min-w-0', className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[160px] w-full touch-none sm:h-[184px]"
        role="img"
        aria-label="Weekly npm downloads across Fluxer.js packages"
        onPointerLeave={() => setActive(null)}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setActive(indexFromX(event.clientX - rect.left, rect.width, points.length));
        }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="70%" stopColor="hsl(var(--primary))" stopOpacity="0.06" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const y = PAD.top + ((baseline - PAD.top) * i) / GRID_LINES;
          return (
            <line
              key={i}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              className={i === GRID_LINES ? 'stroke-border' : 'stroke-border/50'}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <path d={areaPath(points)} fill={`url(#${gradientId})`} />
        <path
          d={linePath(points)}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hover ? (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD.top}
              y2={baseline}
              className="stroke-primary/40"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="4.5"
              className="fill-background stroke-primary"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatMonth(start.day)}</span>
        {mid &&
        formatMonth(mid.day) !== formatMonth(start.day) &&
        formatMonth(mid.day) !== formatMonth(end.day) ? (
          <span>{formatMonth(mid.day)}</span>
        ) : null}
        <span>{formatMonth(end.day)}</span>
      </div>

      {hover ? (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={tooltipStyle(hover.x / WIDTH)}>
          <p className="font-medium text-foreground">{formatWeekLabel(hover.day)}</p>
          <p className="tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatDownloadExact(hover.downloads)}
            </span>{' '}
            downloads
          </p>
        </div>
      ) : (
        <p className="sr-only">Peak week {formatDownloadCount(max)} downloads</p>
      )}
    </div>
  );
}

interface ChartPoint extends DailyDownloads {
  x: number;
  y: number;
}

function layoutPoints(series: DailyDownloads[]): { points: ChartPoint[]; max: number } {
  if (series.length === 0) return { points: [], max: 0 };
  const max = Math.max(...series.map((point) => point.downloads), 1);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const points = series.map((point, i) => {
    const t = series.length === 1 ? 0 : i / (series.length - 1);
    return {
      ...point,
      x: PAD.left + t * innerW,
      y: PAD.top + innerH * (1 - point.downloads / max),
    };
  });
  return { points, max };
}

function linePath(points: ChartPoint[]): string {
  return points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function areaPath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return '';
  const base = HEIGHT - PAD.bottom;
  return `${linePath(points)} L ${last.x.toFixed(2)} ${base} L ${first.x.toFixed(2)} ${base} Z`;
}

function indexFromX(x: number, width: number, n: number): number {
  if (n <= 1) return 0;
  const inner = width * ((WIDTH - PAD.left - PAD.right) / WIDTH);
  const left = width * (PAD.left / WIDTH);
  const t = (x - left) / inner;
  return Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))));
}

function formatMonth(day: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
}

function formatWeekLabel(day: string): string {
  return `Week of ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))}`;
}

function tooltipStyle(pct: number): { left: string; transform?: string } {
  if (pct > 0.82) return { left: '100%', transform: 'translateX(-100%)' };
  if (pct < 0.18) return { left: '0%', transform: 'translateX(0)' };
  return { left: `${Math.round(pct * 100)}%` };
}
