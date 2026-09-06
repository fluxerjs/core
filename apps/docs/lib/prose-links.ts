import { buildAccessPathIndex, buildPathOwnerIndex } from './access-paths';
import { loadApiDocs } from './api-docs';
import type { DocOutput } from './doc-schema';
import { type JsDocLinkHit, parseJsDocLink } from './jsdoc-links';

export interface ProseLinkIndex {
  symbols: Map<string, JsDocLinkHit>;
  paths: Map<string, string>;
}

function symbolHref(kind: string, name: string): string {
  const folder = kind === 'class' ? 'class' : kind === 'enum' ? 'enum' : 'interface';
  return `/docs/${folder}/${name}/`;
}

export function buildProseLinkIndex(
  docs: Pick<DocOutput, 'classes' | 'interfaces' | 'enums'>,
): ProseLinkIndex {
  const symbols = new Map<string, JsDocLinkHit>();
  for (const s of [...docs.classes, ...docs.interfaces, ...docs.enums]) {
    symbols.set(s.name, { name: s.name, href: symbolHref(s.kind, s.name) });
  }
  return { symbols, paths: buildPathOwnerIndex(buildAccessPathIndex(docs)) };
}

let cached: ProseLinkIndex | null = null;

export function getProseLinkIndex(): ProseLinkIndex {
  if (process.env.NODE_ENV !== 'development' && cached) return cached;
  cached = buildProseLinkIndex(loadApiDocs());
  return cached;
}

/** Leading `Client#login` / `client.login` / `Events.MessageCreate` from inline code. */
export function extractProseIdentifier(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('/') || trimmed.includes('://')) {
    return undefined;
  }
  const dotted = trimmed.match(/^((?:[A-Za-z_][\w]*)(?:[.#][A-Za-z_][\w]*)+)/);
  if (dotted?.[1]) return dotted[1];
  const bare = trimmed.match(/^([A-Za-z_][\w]*)$/);
  return bare?.[1];
}

function resolveInstancePath(
  ident: string,
  index: ProseLinkIndex,
): { href: string; label: string } | undefined {
  const parts = ident.split('.');
  if (parts.length < 2) {
    const owner = index.paths.get(ident);
    if (!owner) return undefined;
    const parsed = parseJsDocLink(owner, ident, index.symbols);
    return parsed.href ? { href: parsed.href, label: ident } : undefined;
  }
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('.');
    const member = parts.slice(i).join('.');
    const owner = index.paths.get(prefix);
    if (!owner || member.includes('.')) continue;
    const parsed = parseJsDocLink(`${owner}#${member}`, ident, index.symbols);
    if (parsed.href) return { href: parsed.href, label: ident };
  }
  return undefined;
}

export function resolveProseIdentifier(
  raw: string,
  index: ProseLinkIndex = getProseLinkIndex(),
): { href: string; label: string } | undefined {
  const ident = extractProseIdentifier(raw);
  if (!ident) return undefined;

  const typeName = ident.split(/[.#]/)[0] ?? '';
  if (index.symbols.has(typeName)) {
    const parsed = parseJsDocLink(ident, ident, index.symbols);
    if (parsed.href) return { href: parsed.href, label: ident };
  }

  return resolveInstancePath(ident, index);
}
