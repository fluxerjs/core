import type { ChangelogEntry, ChangelogItem } from '../data/changelog';
import { changelogEntries } from '../data/changelog';
import {
  buildAccessPathIndex,
  isGhostSymbol,
  METHOD_ACTION_KEYWORDS,
  memberAccessPaths,
  preferredPath,
  splitCamelCase,
} from './access-paths';
import { loadApiDocs } from './api-docs';
import type { DocClass, DocEnum, DocInterface, DocOutput } from './doc-schema';
import { getExamples } from './examples';
import { getAllGuides, getGuideBySlug } from './guides';
import { loadOpenApi } from './openapi';

export type SearchKind =
  | 'guide'
  | 'example'
  | 'class'
  | 'method'
  | 'property'
  | 'interface'
  | 'enum'
  | 'rest'
  | 'changelog';

export interface SearchItem {
  id: string;
  kind: SearchKind;
  /** Primary label shown in results (`client.user.leaveGuild()`). */
  title: string;
  description: string;
  href: string;
  package?: string;
  /** Extra keywords for fuzzy match (paths, methods, aliases). */
  keywords?: string;
  /** Member / symbol name (`leaveGuild`). */
  name?: string;
  /** Owning class or enum (`ClientUser`). */
  owner?: string;
  /** Best dotted access path without `()` (`client.user.leaveGuild`). */
  path?: string;
}

export interface SearchIndexInput {
  api: DocOutput;
  guides: {
    slug: string;
    title: string;
    description: string;
    category: string;
    body: string;
    searchTerms?: string;
  }[];
  examples: { slug: string; title: string; description: string; file: string }[];
  rest: {
    operationId: string;
    method: string;
    path: string;
    summary?: string;
    description?: string;
    tags?: string[];
  }[];
  changelog?: ChangelogEntry[];
}

function changelogItemText(item: ChangelogItem): string {
  return typeof item === 'string' ? item : [item.summary, item.detail ?? ''].join(' ');
}

function changelogKeywords(entry: ChangelogEntry): string {
  const bullets = entry.sections.flatMap((section) => [
    section.title,
    ...section.items.map(changelogItemText),
  ]);
  return [entry.version, entry.date, entry.summary ?? '', ...bullets].join(' ');
}

function clip(text: string, max = 180): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function extractGuideKeywords(body: string): string {
  const codes = [...body.matchAll(/`([^`\n]{2,80})`/g)].map((m) => m[1]!);
  const headings = [...body.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) =>
    m[1]!.replace(/#+$/, '').trim(),
  );
  return [...codes, ...headings].join(' ').slice(0, 4000);
}

function memberTitle(paths: string[], owner: string, memberName: string, method: boolean): string {
  const best = preferredPath(paths) ?? `${owner}.${memberName}`;
  return method ? `${best}()` : best;
}

function memberKeywords(
  owner: string,
  memberName: string,
  paths: string[],
  description: string,
  pkg?: string,
): string {
  return [
    memberName,
    `${owner}.${memberName}`,
    `${owner}#${memberName}`,
    ...paths,
    splitCamelCase(memberName),
    METHOD_ACTION_KEYWORDS[memberName] ?? '',
    description,
    pkg ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildSearchItems(input: SearchIndexInput): SearchItem[] {
  const items: SearchItem[] = [];
  const { api } = input;
  const access = buildAccessPathIndex(api);
  const classes = api.classes;

  for (const g of input.guides) {
    items.push({
      id: `guide:${g.slug}`,
      kind: 'guide',
      title: g.title,
      description: g.description,
      href: `/guides/${g.slug}/`,
      keywords: `${g.slug} ${g.category} ${g.searchTerms ?? ''} ${extractGuideKeywords(g.body)}`,
    });
  }

  for (const ex of input.examples) {
    items.push({
      id: `example:${ex.slug}`,
      kind: 'example',
      title: ex.title,
      description: ex.description,
      href: `/examples/${ex.slug}/`,
      keywords: `${ex.slug} ${ex.file}`,
    });
  }

  for (const c of api.classes) {
    if (isGhostSymbol(c.name)) continue;
    pushClassTree(items, c, classes, access);
  }
  for (const i of api.interfaces) {
    if (isGhostSymbol(i.name)) continue;
    pushInterfaceTree(items, i);
  }
  for (const e of api.enums) {
    if (isGhostSymbol(e.name)) continue;
    pushEnumTree(items, e);
  }

  for (const op of input.rest) {
    items.push({
      id: `rest:${op.operationId}`,
      kind: 'rest',
      title: `${op.method.toUpperCase()} ${op.path}`,
      description: clip(op.summary ?? op.description ?? ''),
      href: `/rest/${op.operationId}/`,
      name: op.operationId,
      keywords: `${op.operationId} ${op.method} ${op.path} ${(op.tags ?? []).join(' ')}`,
    });
  }

  for (const entry of input.changelog ?? []) {
    items.push({
      id: `changelog:${entry.version}`,
      kind: 'changelog',
      title: `v${entry.version}`,
      description: clip(entry.summary ?? `Fluxer.js ${entry.version}`),
      href: `/changelog/#${entry.version}`,
      keywords: changelogKeywords(entry),
    });
  }

  return items;
}

function pushClassTree(
  items: SearchItem[],
  c: DocClass,
  classes: DocClass[],
  access: ReturnType<typeof buildAccessPathIndex>,
): void {
  const classPaths = access.classPaths.get(c.name) ?? [];
  items.push({
    id: c.id,
    kind: 'class',
    title: c.name,
    description: clip(c.description ?? ''),
    href: `/docs/class/${c.name}/`,
    package: c.package,
    name: c.name,
    path: preferredPath(classPaths) ?? c.name,
    keywords: `${c.package ?? ''} ${classPaths.join(' ')} ${splitCamelCase(c.name)}`,
  });

  for (const p of c.properties ?? []) {
    const paths = memberAccessPaths(c.name, p.name, access, classes);
    items.push({
      id: `property:${c.name}:${p.name}`,
      kind: 'property',
      title: memberTitle(paths, c.name, p.name, false),
      description: clip(p.description ?? `${p.type} on ${c.name}`),
      href: `/docs/class/${c.name}/#${p.name}`,
      package: c.package,
      name: p.name,
      owner: c.name,
      path: preferredPath(paths) ?? `${c.name}.${p.name}`,
      keywords: memberKeywords(c.name, p.name, paths, p.description ?? '', c.package),
    });
  }

  for (const m of c.methods ?? []) {
    const paths = memberAccessPaths(c.name, m.name, access, classes);
    items.push({
      id: `method:${c.name}:${m.name}`,
      kind: 'method',
      title: memberTitle(paths, c.name, m.name, true),
      description: clip(m.description ?? `${c.name}.${m.name}()`),
      href: `/docs/class/${c.name}/#${m.name}`,
      package: c.package,
      name: m.name,
      owner: c.name,
      path: preferredPath(paths) ?? `${c.name}.${m.name}`,
      keywords: memberKeywords(c.name, m.name, paths, m.description ?? '', c.package),
    });
  }
}

function pushInterfaceTree(items: SearchItem[], i: DocInterface): void {
  items.push({
    id: i.id,
    kind: 'interface',
    title: i.name,
    description: clip(i.description ?? ''),
    href: `/docs/interface/${i.name}/`,
    package: i.package,
    name: i.name,
    keywords: `${i.package ?? ''} ${splitCamelCase(i.name)}`,
  });
  for (const p of i.properties ?? []) {
    items.push({
      id: `property:${i.name}:${p.name}`,
      kind: 'property',
      title: `${i.name}.${p.name}`,
      description: clip(p.description ?? p.type),
      href: `/docs/interface/${i.name}/#${p.name}`,
      package: i.package,
      name: p.name,
      owner: i.name,
      path: `${i.name}.${p.name}`,
      keywords: memberKeywords(
        i.name,
        p.name,
        [`${i.name}.${p.name}`],
        p.description ?? '',
        i.package,
      ),
    });
  }
  for (const m of i.methods ?? []) {
    items.push({
      id: `method:${i.name}:${m.name}`,
      kind: 'method',
      title: `${i.name}.${m.name}()`,
      description: clip(m.description ?? ''),
      href: `/docs/interface/${i.name}/#${m.name}`,
      package: i.package,
      name: m.name,
      owner: i.name,
      path: `${i.name}.${m.name}`,
      keywords: memberKeywords(
        i.name,
        m.name,
        [`${i.name}.${m.name}`],
        m.description ?? '',
        i.package,
      ),
    });
  }
}

function pushEnumTree(items: SearchItem[], e: DocEnum): void {
  items.push({
    id: e.id,
    kind: 'enum',
    title: e.name,
    description: clip(e.description ?? ''),
    href: `/docs/enum/${e.name}/`,
    package: e.package,
    name: e.name,
    keywords: `${e.package ?? ''} ${splitCamelCase(e.name)}`,
  });
  for (const m of e.members ?? []) {
    items.push({
      id: `property:${e.name}:${m.name}`,
      kind: 'property',
      title: `${e.name}.${m.name}`,
      description: clip(`Enum member ${JSON.stringify(m.value)}`),
      href: `/docs/enum/${e.name}/#${m.name}`,
      package: e.package,
      name: m.name,
      owner: e.name,
      path: `${e.name}.${m.name}`,
      keywords: memberKeywords(e.name, m.name, [`${e.name}.${m.name}`], String(m.value), e.package),
    });
  }
}

export function buildSearchIndex(): SearchItem[] {
  return buildSearchItems({
    api: loadApiDocs(),
    guides: getAllGuides().map((g) => ({
      slug: g.slug,
      title: g.title,
      description: g.description,
      category: g.category,
      searchTerms: g.searchTerms,
      body: getGuideBySlug(g.slug)?.content ?? '',
    })),
    examples: getExamples(),
    rest: loadOpenApi().operations,
    changelog: changelogEntries,
  });
}
