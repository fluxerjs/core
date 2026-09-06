import { describe, expect, it } from 'vitest';
import {
  formatDownloadCount,
  formatDownloadExact,
  lastNDaySum,
  mergeDailySeries,
  npmPackageHref,
  shortPackageName,
  summarizeDownloads,
  toWeeklySeries,
  trimLeadingZeros,
} from './npm-downloads';

describe('formatDownloadCount', () => {
  it('keeps small numbers exact', () => {
    expect(formatDownloadCount(0)).toBe('0');
    expect(formatDownloadCount(999)).toBe('999');
  });

  it('uses k and M compact forms', () => {
    expect(formatDownloadCount(1000)).toBe('1k');
    expect(formatDownloadCount(1500)).toBe('1.5k');
    expect(formatDownloadCount(22180)).toBe('22.2k');
    expect(formatDownloadCount(90677)).toBe('90.7k');
    expect(formatDownloadCount(1_000_000)).toBe('1M');
    expect(formatDownloadCount(1_250_000)).toBe('1.3M');
  });

  it('guards invalid values', () => {
    expect(formatDownloadCount(Number.NaN)).toBe('0');
    expect(formatDownloadCount(-4)).toBe('0');
  });
});

describe('formatDownloadExact', () => {
  it('adds grouping separators', () => {
    expect(formatDownloadExact(22180)).toBe('22,180');
  });
});

describe('package labels', () => {
  it('strips the org from scoped names', () => {
    expect(shortPackageName('@fluxerjs/core')).toBe('core');
    expect(shortPackageName('other')).toBe('other');
  });

  it('builds npm package urls', () => {
    expect(npmPackageHref('@fluxerjs/core')).toBe('https://www.npmjs.com/package/@fluxerjs/core');
  });
});

describe('series helpers', () => {
  it('sums matching days across packages', () => {
    expect(
      mergeDailySeries([
        [
          { day: '2026-01-02', downloads: 3 },
          { day: '2026-01-01', downloads: 1 },
        ],
        [{ day: '2026-01-01', downloads: 4 }],
      ]),
    ).toEqual([
      { day: '2026-01-01', downloads: 5 },
      { day: '2026-01-02', downloads: 3 },
    ]);
  });

  it('drops leading empty days', () => {
    expect(
      trimLeadingZeros([
        { day: '2026-01-01', downloads: 0 },
        { day: '2026-01-02', downloads: 0 },
        { day: '2026-01-03', downloads: 2 },
        { day: '2026-01-04', downloads: 0 },
      ]),
    ).toEqual([
      { day: '2026-01-03', downloads: 2 },
      { day: '2026-01-04', downloads: 0 },
    ]);
  });

  it('sums the trailing window', () => {
    const series = [
      { day: '2026-01-01', downloads: 10 },
      { day: '2026-01-02', downloads: 20 },
      { day: '2026-01-03', downloads: 30 },
    ];
    expect(lastNDaySum(series, 2)).toBe(50);
    expect(lastNDaySum(series, 10)).toBe(60);
  });

  it('buckets days into weeks from the start of the series', () => {
    const days = Array.from({ length: 10 }, (_, i) => ({
      day: `2026-01-${String(i + 1).padStart(2, '0')}`,
      downloads: 1,
    }));
    expect(toWeeklySeries(days)).toEqual([
      { day: '2026-01-01', downloads: 7 },
      { day: '2026-01-08', downloads: 3 },
    ]);
  });
});

describe('summarizeDownloads', () => {
  it('returns null when nothing downloaded', () => {
    expect(
      summarizeDownloads([{ name: '@fluxerjs/core', days: [{ day: '2026-01-01', downloads: 0 }] }]),
    ).toBeNull();
    expect(summarizeDownloads([])).toBeNull();
  });

  it('aggregates totals, last 30 days, weekly series, and package rank', () => {
    const core = [...zeros('2026-02-01', 3), ...days('2026-02-04', 14, 2)];
    const voice = [{ day: '2026-02-17', downloads: 10 }];

    const stats = summarizeDownloads([
      { name: '@fluxerjs/voice', days: voice },
      { name: '@fluxerjs/core', days: core },
    ]);

    expect(stats).not.toBeNull();
    expect(stats?.total).toBe(14 * 2 + 10);
    expect(stats?.last30).toBe(14 * 2 + 10);
    expect(stats?.packageCount).toBe(2);
    expect(stats?.packages.map((pkg) => pkg.shortName)).toEqual(['core', 'voice']);
    expect(stats?.series).toEqual([
      { day: '2026-02-04', downloads: 14 },
      { day: '2026-02-11', downloads: 14 + 10 },
    ]);
  });

  it('counts only the last 30 days for the recent total', () => {
    const stats = summarizeDownloads([
      {
        name: '@fluxerjs/core',
        days: [...days('2026-01-01', 10, 5), ...days('2026-01-11', 30, 1)],
      },
    ]);
    expect(stats?.total).toBe(10 * 5 + 30);
    expect(stats?.last30).toBe(30);
  });
});

function days(
  start: string,
  count: number,
  downloads: number,
): { day: string; downloads: number }[] {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => ({
    day: new Date(startMs + i * 86_400_000).toISOString().slice(0, 10),
    downloads,
  }));
}

function zeros(start: string, count: number): { day: string; downloads: number }[] {
  return days(start, count, 0);
}
