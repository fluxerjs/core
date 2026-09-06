'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'fluxer.docs.version';

export type DocsSection = 'docs' | 'guides' | 'other';

export interface ParsedSitePath {
  section: DocsSection;
  /** `'latest'` or a semver without the leading `v`. */
  active: string;
  kind?: string;
  name?: string;
  guideSlug?: string;
}

export function parseSitePath(pathname: string | null): ParsedSitePath {
  if (!pathname) return { section: 'other', active: 'latest' };

  const versionedGuides = pathname.match(/^\/guides\/v\/([^/]+)(?:\/([^/]+))?/);
  if (versionedGuides) {
    return {
      section: 'guides',
      active: versionedGuides[1]!,
      guideSlug: versionedGuides[2] ? decodeURIComponent(versionedGuides[2]) : undefined,
    };
  }

  if (pathname === '/guides' || pathname === '/guides/' || pathname.startsWith('/guides/')) {
    const latestGuide = pathname.match(/^\/guides\/([^/]+)\/?$/);
    return {
      section: 'guides',
      active: 'latest',
      guideSlug: latestGuide?.[1] ? decodeURIComponent(latestGuide[1]) : undefined,
    };
  }

  const versionedDocs = pathname.match(/^\/docs\/v\/([^/]+)(?:\/(class|interface|enum)\/([^/]+))?/);
  if (versionedDocs) {
    return {
      section: 'docs',
      active: versionedDocs[1]!,
      kind: versionedDocs[2],
      name: versionedDocs[3] ? decodeURIComponent(versionedDocs[3]) : undefined,
    };
  }

  const latestSymbol = pathname.match(/^\/docs\/(class|interface|enum)\/([^/]+)/);
  if (latestSymbol) {
    return {
      section: 'docs',
      active: 'latest',
      kind: latestSymbol[1],
      name: decodeURIComponent(latestSymbol[2]!),
    };
  }

  if (pathname === '/docs' || pathname === '/docs/' || pathname.startsWith('/docs/')) {
    return { section: 'docs', active: 'latest' };
  }

  return { section: 'other', active: 'latest' };
}

/** Normalize a preferred version key (`latest` or semver). */
export function normalizePreferredVersion(
  value: string,
  latest: string,
  versions: string[],
): string {
  if (!value || value === 'latest' || value === latest) return 'latest';
  if (versions.includes(value)) return value;
  return 'latest';
}

export function hrefForVersion(
  target: string,
  section: DocsSection,
  kind?: string,
  name?: string,
  guideSlug?: string,
  currentPath?: string,
): string {
  if (section === 'guides') {
    const base = target === 'latest' ? '/guides' : `/guides/v/${target}`;
    if (guideSlug) return `${base}/${guideSlug}/`;
    return `${base}/`;
  }

  if (section === 'docs') {
    const base = target === 'latest' ? '/docs' : `/docs/v/${target}`;
    if (kind && name) return `${base}/${kind}/${name}/`;
    return `${base}/`;
  }

  if (currentPath) {
    return currentPath === '/' || currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
  }
  return '/';
}

/** Top-bar index URL for Guides or SDK, honoring the preferred docs version. */
export function sectionIndexHref(section: 'docs' | 'guides', preferred: string): string {
  return hrefForVersion(preferred, section);
}

interface DocsVersionContextValue {
  latest: string;
  versions: string[];
  /** Preferred version key: `'latest'` or a tagged semver. */
  preferred: string;
  setPreferred: (version: string) => void;
  /** Label shown in the picker (semver without `v`). */
  displayVersion: string;
}

const DocsVersionContext = createContext<DocsVersionContextValue | null>(null);

function readStoredVersion(latest: string, versions: string[]): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'latest';
    return normalizePreferredVersion(raw, latest, versions);
  } catch {
    return 'latest';
  }
}

function writeStoredVersion(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function DocsVersionProvider({
  latest,
  versions,
  children,
}: {
  latest: string;
  versions: string[];
  children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const [preferred, setPreferredState] = useState('latest');

  // Hydrate from localStorage once on the client.
  useEffect(() => {
    setPreferredState(readStoredVersion(latest, versions));
  }, [latest, versions]);

  // Keep preference in sync when browsing versioned Guides/SDK URLs.
  useEffect(() => {
    const { section, active } = parseSitePath(pathname);
    if (section !== 'docs' && section !== 'guides') return;
    const next = normalizePreferredVersion(active, latest, versions);
    setPreferredState((prev) => {
      if (prev === next) return prev;
      writeStoredVersion(next);
      return next;
    });
  }, [pathname, latest, versions]);

  const setPreferred = useCallback(
    (version: string) => {
      const next = normalizePreferredVersion(version, latest, versions);
      setPreferredState(next);
      writeStoredVersion(next);
    },
    [latest, versions],
  );

  const displayVersion = preferred === 'latest' ? latest : preferred;

  const value = useMemo(
    () => ({ latest, versions, preferred, setPreferred, displayVersion }),
    [latest, versions, preferred, setPreferred, displayVersion],
  );

  return <DocsVersionContext.Provider value={value}>{children}</DocsVersionContext.Provider>;
}

export function useDocsVersion(): DocsVersionContextValue {
  const ctx = useContext(DocsVersionContext);
  if (!ctx) {
    throw new Error('useDocsVersion must be used within DocsVersionProvider');
  }
  return ctx;
}
