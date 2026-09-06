#!/usr/bin/env node

/**
 * Generate combined API documentation JSON from all SDK packages.
 *
 * Outputs:
 *   apps/docs/public/api/main.json            latest (working tree)
 *   apps/docs/public/api/v<version>/main.json one per 2.0+ git tag
 *   apps/docs/public/api/versions.json        manifest
 *   apps/docs/public/guides/v<version>/       MDX guide snapshots per tag
 *
 * Deploy clones are often shallow and may lack an `origin` remote (e.g. Vercel).
 * Before generating tagged docs we fetch 2.0+ tags from the GitHub HTTPS URL
 * (override with DOCS_GIT_REMOTE). Set DOCS_ALLOW_PARTIAL=1 to warn instead of
 * failing when a tag cannot be built.
 *
 * Tagged versions are extracted with `git archive` (package sources + guides
 * only). Docgen still emits signatures from the TypeScript AST without an
 * install. Cross-package type text may be less precise than a fully installed
 * build: acceptable for reference docs.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocOutput } from '@fluxerjs/docgen';
import { generateDocs } from '@fluxerjs/docgen';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** Public repo used when `origin` is missing (common on Vercel). */
const DEFAULT_DOCS_GIT_REMOTE = 'https://github.com/fluxerjs/core.git';
const DEFAULT_GITHUB_REPO = 'fluxerjs/core';

const PACKAGES: { id: string; name: string; pkgPath: string }[] = [
  { id: 'core', name: '@fluxerjs/core', pkgPath: 'packages/fluxer-core' },
  { id: 'builders', name: '@fluxerjs/builders', pkgPath: 'packages/builders' },
  { id: 'rest', name: '@fluxerjs/rest', pkgPath: 'packages/rest' },
  { id: 'ws', name: '@fluxerjs/ws', pkgPath: 'packages/ws' },
  { id: 'voice', name: '@fluxerjs/voice', pkgPath: 'packages/voice' },
  { id: 'sharding', name: '@fluxerjs/sharding', pkgPath: 'packages/sharding' },
  { id: 'sharding-redis', name: '@fluxerjs/sharding-redis', pkgPath: 'packages/sharding-redis' },
  { id: 'util', name: '@fluxerjs/util', pkgPath: 'packages/util' },
  { id: 'collection', name: '@fluxerjs/collection', pkgPath: 'packages/collection' },
  { id: 'types', name: '@fluxerjs/types', pkgPath: 'packages/types' },
];

const API_DIR = resolve(root, 'apps/docs/public/api');

export interface VersionsManifest {
  latest: string;
  versions: string[];
}

/** Working-tree SDK version — prefer `@fluxerjs/core`, then monorepo root. */
function getVersion(repoRoot: string): string {
  const candidates = [
    resolve(repoRoot, 'packages/fluxer-core/package.json'),
    resolve(repoRoot, 'package.json'),
  ];
  for (const file of candidates) {
    try {
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, 'utf-8')) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      /* try next */
    }
  }
  return '2.0.0';
}

function parseSemver(version: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareSemverDesc(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return b.localeCompare(a);
  for (let i = 0; i < 3; i++) {
    if (pa[i]! !== pb[i]!) return pb[i]! - pa[i]!;
  }
  return 0;
}

function isV2OrNewer(version: string): boolean {
  const p = parseSemver(version);
  return p !== null && p[0] >= 2;
}

function formatGitError(err: unknown): string {
  if (err && typeof err === 'object' && 'stderr' in err) {
    const stderr = (err as { stderr?: Buffer | string }).stderr;
    if (stderr) return String(stderr).trim();
  }
  return err instanceof Error ? err.message : String(err);
}

/** HTTPS git URL to fetch release tags from (does not require a named remote). */
function getDocsGitRemote(): string {
  const fromEnv = process.env.DOCS_GIT_REMOTE?.trim();
  if (fromEnv) return fromEnv;

  // Vercel deploy clones often omit or break `origin`; use the public HTTPS URL.
  if (process.env.VERCEL) return DEFAULT_DOCS_GIT_REMOTE;

  try {
    const origin = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (origin) return origin;
  } catch {
    /* no origin — use public GitHub URL */
  }

  return DEFAULT_DOCS_GIT_REMOTE;
}

/** owner/repo for GitHub API, derived from a git remote URL when possible. */
function getGithubRepoSlug(remote: string): string {
  const fromEnv = process.env.DOCS_GITHUB_REPO?.trim();
  if (fromEnv) return fromEnv;

  const m =
    /github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/i.exec(remote.trim()) ??
    /github\.com\/([^/]+)\/([^/.]+)/i.exec(remote);
  if (m) return `${m[1]}/${m[2]}`;
  return DEFAULT_GITHUB_REPO;
}

function githubAuthHeaders(): Record<string, string> {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.VERCEL_GIT_PROVIDER_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'fluxerjs-generate-docs',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * List 2.0+ release tag names via the GitHub Tags API.
 * Returns versions without the leading `v`, newest first.
 */
async function listV2TagsFromGithub(repo: string): Promise<string[]> {
  const headers = githubAuthHeaders();
  const versions: string[] = [];
  let page = 1;

  // Tags API is simpler than matching-refs and returns newest-first.
  for (;;) {
    const url = `https://api.github.com/repos/${repo}/tags?per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GitHub tags API ${res.status}: ${body.slice(0, 200) || res.statusText}`);
    }
    const batch = (await res.json()) as { name?: string }[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const tag of batch) {
      const name = tag.name?.trim();
      if (!name) continue;
      const version = name.startsWith('v') ? name.slice(1) : name;
      if (isV2OrNewer(version)) versions.push(version);
    }

    if (batch.length < 100) break;
    page += 1;
    if (page > 20) break; // safety cap
  }

  return [...new Set(versions)].sort(compareSemverDesc);
}

/**
 * Ensure release tags (and their commits) exist locally.
 * Shallow deploy clones only have HEAD and often lack `origin`; fetch from the
 * GitHub HTTPS URL (or DOCS_GIT_REMOTE) so older versions can be archived.
 */
async function ensureReleaseTags(): Promise<void> {
  let inGitRepo = true;
  let shallow = false;
  try {
    shallow =
      execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
        cwd: root,
        encoding: 'utf-8',
      }).trim() === 'true';
  } catch {
    inGitRepo = false;
  }

  if (!inGitRepo) {
    console.warn('[generate-docs] not a git repository; cannot fetch tagged versions');
    return;
  }

  const remote = getDocsGitRemote();
  console.log(
    shallow
      ? `[generate-docs] shallow clone detected; fetching release tags from ${remote}…`
      : `[generate-docs] fetching release tags from ${remote}…`,
  );

  const repo = getGithubRepoSlug(remote);
  let remoteVersions: string[] = [];
  try {
    remoteVersions = await listV2TagsFromGithub(repo);
    console.log(
      `[generate-docs] GitHub ${repo}: ${remoteVersions.length} 2.0+ tag(s): ${remoteVersions.join(', ') || '(none)'}`,
    );
  } catch (err) {
    console.warn(
      `[generate-docs] could not list tags via GitHub API (will try git fetch --tags): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    if (remoteVersions.length > 0) {
      // Depth-1 per tag: Vercel images OOM/ENOSPC if we unshallow full history.
      for (const version of remoteVersions) {
        execFileSync(
          'git',
          [
            'fetch',
            '--depth=1',
            '--force',
            '--no-tags',
            remote,
            `+refs/tags/v${version}:refs/tags/v${version}`,
          ],
          {
            cwd: root,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 32 * 1024 * 1024,
          },
        );
      }
    } else {
      execFileSync('git', ['fetch', '--tags', '--depth=1', '--force', remote], {
        cwd: root,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 32 * 1024 * 1024,
      });
    }
  } catch (err) {
    console.warn(
      `[generate-docs] could not fetch tags from ${remote} (continuing with local tags): ${formatGitError(err)}`,
    );
  }
}

/** Discover 2.0+ tags (>= 2.0.0), newest first. */
function listV2Tags(): string[] {
  try {
    const out = execFileSync('git', ['tag', '--list', 'v[2-9].*'], {
      cwd: root,
      encoding: 'utf-8',
    });
    const versions = out
      .split(/\r?\n/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('v') ? tag.slice(1) : tag))
      .filter(isV2OrNewer);
    return [...new Set(versions)].sort(compareSemverDesc);
  } catch (err) {
    console.warn('[generate-docs] Failed to list git tags:', err);
    return [];
  }
}

/** True when `git rev-parse` can resolve the tag to a commit. */
function tagCommitResolvable(version: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', `v${version}^{commit}`], {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Build combined DocOutput for a given repo root (working tree or tag extract).
 * Uses the TypeScript compiler API only — no install/build of packages required.
 */
export function buildCombinedDocs(repoRoot: string, version: string): DocOutput {
  const allClasses: DocOutput['classes'] = [];
  const allInterfaces: DocOutput['interfaces'] = [];
  const allEnums: DocOutput['enums'] = [];
  const packages = new Set<string>();
  const seen = new Set<string>();
  const tempDir = resolve(API_DIR, '_temp');
  mkdirSync(tempDir, { recursive: true });

  for (const pkg of PACKAGES) {
    const pkgRoot = resolve(repoRoot, pkg.pkgPath);
    const tsconfigPath = resolve(pkgRoot, 'tsconfig.json');
    if (!existsSync(tsconfigPath)) {
      console.warn(`[generate-docs] skip ${pkg.name}: no tsconfig at ${tsconfigPath}`);
      continue;
    }

    const tempFile = resolve(tempDir, `_temp_${pkg.id}.json`);
    try {
      generateDocs({
        entryPoints: ['src/index.ts'],
        tsconfigPath,
        packageName: pkg.name,
        outFile: tempFile,
        repoRoot,
      });
    } catch (err) {
      console.warn(`[generate-docs] skip ${pkg.name}:`, err);
      continue;
    }

    if (!existsSync(tempFile)) continue;
    const data = JSON.parse(readFileSync(tempFile, 'utf-8')) as DocOutput;
    unlinkSync(tempFile);

    for (const c of data.classes ?? []) {
      const key = c.id ?? `class:${c.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        allClasses.push({ ...c, id: key, kind: 'class', package: pkg.name });
        packages.add(pkg.name);
      }
    }
    for (const i of data.interfaces ?? []) {
      const key = i.id ?? `interface:${i.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        allInterfaces.push({ ...i, id: key, kind: 'interface', package: pkg.name });
        packages.add(pkg.name);
      }
    }
    for (const e of data.enums ?? []) {
      const key = e.id ?? `enum:${e.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        allEnums.push({ ...e, id: key, kind: 'enum', package: pkg.name });
        packages.add(pkg.name);
      }
    }
    console.log(`[generate-docs] ${pkg.name}`);
  }

  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  allClasses.sort((a, b) => a.name.localeCompare(b.name));
  allInterfaces.sort((a, b) => a.name.localeCompare(b.name));
  allEnums.sort((a, b) => a.name.localeCompare(b.name));

  return {
    meta: { generator: 'fluxer-docgen', version: '2', date: Date.now() },
    package: '@fluxerjs/core',
    version,
    packages: Array.from(packages).sort(),
    classes: allClasses,
    interfaces: allInterfaces,
    enums: allEnums,
  };
}

function writeDocsFile(filePath: string, docs: DocOutput): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(docs), 'utf-8');
  console.log(
    `[generate-docs] -> ${filePath} (${docs.classes.length} classes, ${docs.interfaces.length} interfaces, ${docs.enums.length} enums)`,
  );
}

function pathExistsInTag(tag: string, filePath: string): boolean {
  try {
    execFileSync('git', ['cat-file', '-e', `${tag}:${filePath}`], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/** Paths needed to generate API docs + guide snapshots for a tag. */
function listTagArchivePaths(tag: string): string[] {
  const paths: string[] = [];
  for (const pkg of PACKAGES) {
    if (pathExistsInTag(tag, `${pkg.pkgPath}/tsconfig.json`)) {
      paths.push(pkg.pkgPath);
    }
  }
  if (pathExistsInTag(tag, 'apps/docs/content/guides')) {
    paths.push('apps/docs/content/guides');
  }
  return paths;
}

function extractTagSparse(tag: string, dest: string, paths: string[]): boolean {
  mkdirSync(dest, { recursive: true });
  const archive = spawnSync('git', ['archive', tag, ...paths], {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: 128 * 1024 * 1024,
  });
  if (archive.status !== 0) {
    const err = archive.stderr?.toString().trim() || `git archive exited ${archive.status}`;
    console.warn(`[generate-docs] git archive ${tag} failed: ${err}`);
    return false;
  }
  const tar = spawnSync('tar', ['-x', '-C', dest], {
    input: archive.stdout,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (tar.status !== 0) {
    const err = tar.stderr?.toString().trim() || `tar exited ${tar.status}`;
    console.warn(`[generate-docs] tar extract ${tag} failed: ${err}`);
    return false;
  }
  return true;
}

/** Copy guide MDX from a tag checkout into public/guides/v{version}/. */
function snapshotGuides(checkoutPath: string, version: string): void {
  const src = resolve(checkoutPath, 'apps/docs/content/guides');
  const dest = resolve(root, 'apps/docs/public/guides', `v${version}`);
  if (!existsSync(src)) {
    throw new Error(`missing guides directory at ${src}`);
  }
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  const count = readdirSync(dest).filter((f) => f.endsWith('.mdx')).length;
  console.log(`[generate-docs] -> ${dest} (${count} guides)`);
}

function generateTagDocs(version: string): boolean {
  const tag = `v${version}`;
  if (!tagCommitResolvable(version)) {
    console.warn(`[generate-docs] tag ${tag} is not resolvable to a commit`);
    return false;
  }

  const paths = listTagArchivePaths(tag);
  if (paths.length === 0) {
    console.warn(`[generate-docs] tag ${tag} has no package or guides paths to archive`);
    return false;
  }

  const checkoutPath = join(tmpdir(), `fluxer-docs-${version}-${randomBytes(4).toString('hex')}`);
  console.log(`[generate-docs] archive ${tag} -> ${checkoutPath}`);

  if (!extractTagSparse(tag, checkoutPath, paths)) {
    rmSync(checkoutPath, { recursive: true, force: true });
    return false;
  }

  try {
    const docs = buildCombinedDocs(checkoutPath, version);
    writeDocsFile(resolve(API_DIR, `v${version}`, 'main.json'), docs);
    snapshotGuides(checkoutPath, version);
    return true;
  } catch (err) {
    console.warn(`[generate-docs] failed to generate docs for ${tag}:`, err);
    return false;
  } finally {
    rmSync(checkoutPath, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  mkdirSync(API_DIR, { recursive: true });

  const latestVersion = getVersion(root);
  console.log(`[generate-docs] latest (working tree) ${latestVersion}`);
  const latestDocs = buildCombinedDocs(root, latestVersion);
  writeDocsFile(resolve(API_DIR, 'main.json'), latestDocs);

  if (process.env.DOCS_LATEST_ONLY === '1') {
    console.log('[generate-docs] DOCS_LATEST_ONLY=1; skipping tagged versions');
    let tagged: string[] = [];
    const manifestPath = resolve(API_DIR, 'versions.json');
    try {
      const existing = JSON.parse(readFileSync(manifestPath, 'utf8')) as VersionsManifest;
      tagged = Array.isArray(existing.versions) ? existing.versions : [];
    } catch {
      tagged = [];
    }
    writeFileSync(
      manifestPath,
      JSON.stringify({ latest: latestVersion, versions: tagged }),
      'utf-8',
    );
    console.log(`[generate-docs] -> ${manifestPath} (latest ${latestVersion})`);
    return;
  }

  await ensureReleaseTags();
  const tags = listV2Tags();
  console.log(`[generate-docs] found ${tags.length} 2.0+ tag(s): ${tags.join(', ') || '(none)'}`);

  const generatedVersions: string[] = [];
  const failedVersions: string[] = [];
  for (const version of tags) {
    try {
      if (generateTagDocs(version)) {
        generatedVersions.push(version);
      } else {
        failedVersions.push(version);
      }
    } catch (err) {
      console.warn(`[generate-docs] skipping tag v${version}:`, err);
      failedVersions.push(version);
    }
  }

  // Manifest: tagged versions only (latest is always the working-tree build).
  const manifest: VersionsManifest = {
    latest: latestVersion,
    versions: generatedVersions,
  };
  const manifestPath = resolve(API_DIR, 'versions.json');
  writeFileSync(manifestPath, JSON.stringify(manifest), 'utf-8');
  console.log(`[generate-docs] -> ${manifestPath}`);
  console.log(`[generate-docs] tagged versions: ${generatedVersions.join(', ') || '(none)'}`);

  if (failedVersions.length > 0) {
    const list = failedVersions.map((v) => `v${v}`).join(', ');
    const allowPartial = process.env.DOCS_ALLOW_PARTIAL === '1';
    const message = `[generate-docs] failed to generate docs for: ${list}`;
    if (allowPartial) {
      console.warn(`${message} (DOCS_ALLOW_PARTIAL=1; continuing)`);
    } else {
      console.error(message);
      console.error(
        '[generate-docs] Fix: ensure tags can be fetched from GitHub (network / DOCS_GIT_REMOTE), or set DOCS_ALLOW_PARTIAL=1',
      );
      process.exit(1);
    }
  }

  console.log('[generate-docs] Done');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
