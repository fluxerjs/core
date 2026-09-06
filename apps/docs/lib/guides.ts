import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { isTaggedVersion } from './api-docs';

export interface GuideFrontmatter {
  title: string;
  description: string;
  category: string;
  order: number;
  /** Extra search phrases (tasks, aliases) indexed on the docs site. */
  searchTerms?: string;
}

export interface GuideMeta extends GuideFrontmatter {
  slug: string;
}

/** Normalize version key used for caching / file lookup. */
function versionKey(version?: string): string {
  if (!version || version === 'latest') return 'latest';
  return version.startsWith('v') ? version.slice(1) : version;
}

function resolveGuidesDir(version?: string): string {
  const key = versionKey(version);
  if (key === 'latest' || !isTaggedVersion(key)) {
    return path.join(process.cwd(), 'content', 'guides');
  }
  return path.join(process.cwd(), 'public', 'guides', `v${key}`);
}

/** Guides base path for a version (`/guides` or `/guides/v/2.0.0`). */
export function guidesBasePath(version?: string): string {
  const key = versionKey(version);
  if (key === 'latest' || !isTaggedVersion(key)) return '/guides';
  return `/guides/v/${key}`;
}

/**
 * Rewrite absolute `/guides/...` markdown links to the versioned base path.
 * Leaves `/guides/v/...` links alone.
 */
export function rewriteGuideLinks(content: string, version?: string): string {
  const base = guidesBasePath(version);
  if (base === '/guides') return content;
  return content.replace(/\]\(\/guides\/(?!v\/)/g, `](${base}/`);
}

export function getGuideSlugs(version?: string): string[] {
  const dir = resolveGuidesDir(version);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
}

export function getAllGuides(version?: string): GuideMeta[] {
  const dir = resolveGuidesDir(version);
  return getGuideSlugs(version)
    .map((slug) => {
      const raw = fs.readFileSync(path.join(dir, `${slug}.mdx`), 'utf8');
      const { data } = matter(raw);
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ''),
        category: String(data.category ?? 'other'),
        order: Number(data.order ?? 999),
        ...(typeof data.searchTerms === 'string' && data.searchTerms
          ? { searchTerms: data.searchTerms }
          : {}),
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getGuideBySlug(
  slug: string,
  version?: string,
): { meta: GuideMeta; content: string } | null {
  const file = path.join(resolveGuidesDir(version), `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(raw);
  return {
    meta: {
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ''),
      category: String(data.category ?? 'other'),
      order: Number(data.order ?? 999),
      ...(typeof data.searchTerms === 'string' && data.searchTerms
        ? { searchTerms: data.searchTerms }
        : {}),
    },
    content: rewriteGuideLinks(content, version),
  };
}

export function getGuidesByCategory(version?: string): Record<string, GuideMeta[]> {
  const grouped: Record<string, GuideMeta[]> = {};
  for (const g of getAllGuides(version)) {
    (grouped[g.category] ??= []).push(g);
  }
  return grouped;
}

/** Previous/next within the same category (already sorted by order then title). */
export function adjacentGuides(
  guides: GuideMeta[],
  slug: string,
): { prev: GuideMeta | null; next: GuideMeta | null } {
  const current = guides.find((g) => g.slug === slug);
  if (!current) return { prev: null, next: null };
  const same = guides.filter((g) => g.category === current.category);
  const idx = same.findIndex((g) => g.slug === slug);
  return {
    prev: idx > 0 ? (same[idx - 1] ?? null) : null,
    next: idx >= 0 && idx < same.length - 1 ? (same[idx + 1] ?? null) : null,
  };
}
