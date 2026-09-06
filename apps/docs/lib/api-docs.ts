import fs from 'node:fs';
import path from 'node:path';
import type { DocOutput, DocSymbol } from './doc-schema';

export type { DocClass, DocEnum, DocInterface, DocOutput, DocSymbol } from './doc-schema';

export interface VersionsManifest {
  latest: string;
  /** Tagged versions with generated docs (semver without leading v), newest first. */
  versions: string[];
}

const API_DIR = path.join(process.cwd(), 'public', 'api');
const VERSIONS_FILE = path.join(API_DIR, 'versions.json');

const docsCache = new Map<string, DocOutput>();
let versionsCache: VersionsManifest | null = null;

const EMPTY_DOCS: DocOutput = {
  meta: { generator: 'fluxer-docgen', version: '2', date: Date.now() },
  package: '@fluxerjs/core',
  version: '2.0.0',
  packages: [],
  classes: [],
  interfaces: [],
  enums: [],
};

/** Normalize version key used for caching / file lookup. */
function versionKey(version?: string): string {
  if (!version || version === 'latest') return 'latest';
  return version.startsWith('v') ? version.slice(1) : version;
}

function resolveApiFile(version?: string): string {
  const key = versionKey(version);
  if (key === 'latest') return path.join(API_DIR, 'main.json');
  return path.join(API_DIR, `v${key}`, 'main.json');
}

export function loadVersions(): VersionsManifest {
  if (versionsCache) return versionsCache;
  if (!fs.existsSync(VERSIONS_FILE)) {
    versionsCache = { latest: '2.0.0', versions: [] };
    return versionsCache;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(VERSIONS_FILE, 'utf8')) as VersionsManifest;
    versionsCache = {
      latest: raw.latest ?? '2.0.0',
      versions: Array.isArray(raw.versions) ? raw.versions : [],
    };
  } catch {
    versionsCache = { latest: '2.0.0', versions: [] };
  }
  return versionsCache;
}

/** True when `version` is a tagged release (not latest working tree). */
export function isTaggedVersion(version?: string): boolean {
  const key = versionKey(version);
  if (key === 'latest') return false;
  return loadVersions().versions.includes(key);
}

export function loadApiDocsFor(version?: string): DocOutput {
  const key = versionKey(version);
  const useCache = process.env.NODE_ENV !== 'development';
  if (useCache) {
    const cached = docsCache.get(key);
    if (cached) return cached;
  }

  const file = resolveApiFile(key);
  if (!fs.existsSync(file)) {
    if (useCache) docsCache.set(key, EMPTY_DOCS);
    return EMPTY_DOCS;
  }
  const docs = JSON.parse(fs.readFileSync(file, 'utf8')) as DocOutput;
  if (useCache) docsCache.set(key, docs);
  return docs;
}

/** Latest (working tree) SDK docs. */
export function loadApiDocs(): DocOutput {
  return loadApiDocsFor('latest');
}

export function getAllSymbols(version?: string): DocSymbol[] {
  const docs = loadApiDocsFor(version);
  return [...docs.classes, ...docs.interfaces, ...docs.enums];
}

export function getSymbol(kind: string, name: string, version?: string): DocSymbol | undefined {
  const docs = loadApiDocsFor(version);
  if (kind === 'class') return docs.classes.find((c) => c.name === name);
  if (kind === 'interface') return docs.interfaces.find((i) => i.name === name);
  if (kind === 'enum') return docs.enums.find((e) => e.name === name);
  return undefined;
}

/**
 * GitHub blob URL for a symbol source location.
 * @param ref - git ref (`main` for latest, or `v2.0.0` for a tagged version)
 */
export function githubSourceUrl(
  source?: { path?: string; line?: number },
  ref = 'main',
): string | null {
  if (!source?.path) return null;
  const line = source.line ? `#L${source.line}` : '';
  return `https://github.com/fluxerjs/core/blob/${ref}/${source.path}${line}`;
}

/** Docs base path for a version (`/docs` or `/docs/v/2.0.0`). */
export function docsBasePath(version?: string): string {
  const key = versionKey(version);
  if (key === 'latest' || !isTaggedVersion(key)) return '/docs';
  return `/docs/v/${key}`;
}

/** GitHub ref for source links for a given docs version. */
export function docsGitRef(version?: string): string {
  const key = versionKey(version);
  if (key === 'latest' || !isTaggedVersion(key)) return 'main';
  return `v${key}`;
}
