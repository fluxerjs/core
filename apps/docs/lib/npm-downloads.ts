/** Published npm packages shown on the docs homepage downloads graph. */
export const NPM_PACKAGES = [
  '@fluxerjs/core',
  '@fluxerjs/builders',
  '@fluxerjs/collection',
  '@fluxerjs/rest',
  '@fluxerjs/ws',
  '@fluxerjs/types',
  '@fluxerjs/util',
  '@fluxerjs/voice',
  '@fluxerjs/sharding',
  '@fluxerjs/sharding-redis',
] as const;

export type NpmPackageName = (typeof NPM_PACKAGES)[number];

export interface DailyDownloads {
  day: string;
  downloads: number;
}

export interface PackageDownloadTotal {
  name: NpmPackageName;
  shortName: string;
  total: number;
  href: string;
}

export interface NpmDownloadStats {
  total: number;
  last30: number;
  packageCount: number;
  series: DailyDownloads[];
  packages: PackageDownloadTotal[];
}

const LAST_30 = 30;
const WEEK = 7;
const NPM_RANGE = 'last-year';

export function npmPackageHref(name: string): string {
  return `https://www.npmjs.com/package/${name}`;
}

export function shortPackageName(name: string): string {
  return name.startsWith('@fluxerjs/') ? name.slice('@fluxerjs/'.length) : name;
}

export function formatDownloadCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    const digits = k >= 100 ? 0 : 1;
    return `${trimTrailingZero(k.toFixed(digits))}k`;
  }
  const m = n / 1_000_000;
  const digits = m >= 100 ? 0 : 1;
  return `${trimTrailingZero(m.toFixed(digits))}M`;
}

export function formatDownloadExact(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(n)));
}

export function mergeDailySeries(seriesList: DailyDownloads[][]): DailyDownloads[] {
  const byDay = new Map<string, number>();
  for (const series of seriesList) {
    for (const point of series) {
      if (!isDay(point.day) || !Number.isFinite(point.downloads)) continue;
      byDay.set(point.day, (byDay.get(point.day) ?? 0) + Math.max(0, point.downloads));
    }
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, downloads]) => ({ day, downloads }));
}

export function trimLeadingZeros(series: DailyDownloads[]): DailyDownloads[] {
  const first = series.findIndex((point) => point.downloads > 0);
  if (first <= 0) return series;
  return series.slice(first);
}

export function lastNDaySum(series: DailyDownloads[], n: number): number {
  if (n <= 0 || series.length === 0) return 0;
  return series.slice(-n).reduce((sum, point) => sum + point.downloads, 0);
}

export function toWeeklySeries(series: DailyDownloads[]): DailyDownloads[] {
  if (series.length === 0) return [];
  const weeks: DailyDownloads[] = [];
  let start = series[0]?.day ?? '';
  let downloads = 0;
  let count = 0;
  for (const point of series) {
    if (count === WEEK) {
      weeks.push({ day: start, downloads });
      start = point.day;
      downloads = 0;
      count = 0;
    }
    downloads += point.downloads;
    count += 1;
  }
  if (count > 0) weeks.push({ day: start, downloads });
  return weeks;
}

export function summarizeDownloads(
  perPackage: { name: NpmPackageName; days: DailyDownloads[] }[],
): NpmDownloadStats | null {
  const withData = perPackage.filter((entry) => entry.days.length > 0);
  if (withData.length === 0) return null;

  const daily = trimLeadingZeros(mergeDailySeries(withData.map((entry) => entry.days)));
  const total = daily.reduce((sum, point) => sum + point.downloads, 0);
  if (total <= 0) return null;

  const packages = withData
    .map((entry) => ({
      name: entry.name,
      shortName: shortPackageName(entry.name),
      total: entry.days.reduce((sum, point) => sum + point.downloads, 0),
      href: npmPackageHref(entry.name),
    }))
    .sort((a, b) => b.total - a.total || a.shortName.localeCompare(b.shortName));

  return {
    total,
    last30: lastNDaySum(daily, LAST_30),
    packageCount: packages.length,
    series: toWeeklySeries(daily),
    packages,
  };
}

export async function loadNpmDownloadStats(
  cache: RequestCache = 'force-cache',
): Promise<NpmDownloadStats | null> {
  try {
    const results = await Promise.all(
      NPM_PACKAGES.map(async (name) => {
        const days = await fetchPackageRange(name, cache);
        return { name, days };
      }),
    );
    return summarizeDownloads(results);
  } catch {
    return null;
  }
}

async function fetchPackageRange(
  name: NpmPackageName,
  cache: RequestCache = 'force-cache',
): Promise<DailyDownloads[]> {
  const url = `https://api.npmjs.org/downloads/range/${NPM_RANGE}/${name.replace('/', '%2F')}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      cache,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    return parseRangeBody(body);
  } catch {
    return [];
  }
}

function parseRangeBody(body: unknown): DailyDownloads[] {
  if (!body || typeof body !== 'object' || !('downloads' in body)) return [];
  const raw = (body as { downloads: unknown }).downloads;
  if (!Array.isArray(raw)) return [];
  const days: DailyDownloads[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const day = 'day' in row && typeof row.day === 'string' ? row.day : '';
    const downloads = 'downloads' in row && typeof row.downloads === 'number' ? row.downloads : NaN;
    if (!isDay(day) || !Number.isFinite(downloads)) continue;
    days.push({ day, downloads: Math.max(0, downloads) });
  }
  return days;
}

function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, '');
}
