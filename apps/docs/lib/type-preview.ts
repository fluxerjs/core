import { getAllSymbols } from './api-docs';
import type { DocSymbol } from './doc-schema';

export type TypePreviewKind = 'class' | 'interface' | 'enum';

export interface TypePreviewMember {
  name: string;
  detail: string;
}

export interface TypePreviewData {
  name: string;
  kind: TypePreviewKind;
  href: string;
  description?: string;
  signature?: string;
  members: TypePreviewMember[];
  more: number;
}

const PREVIEW_LIMIT = 10;
const MAX_PREVIEW_SIGNATURE = 220;

/** Collapse expanded object dumps so pages stay scannable. Named types are kept. */
export function collapseTypeDisplay(type: string): string {
  const trimmed = type.replace(/\s+/g, ' ').trim();
  if (!trimmed) return type;
  if (/^typeof\s+[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) return trimmed;
  const semicolons = trimmed.match(/;/g)?.length ?? 0;
  const looksLikeObjectDump =
    (trimmed.startsWith('{') && trimmed.endsWith('}') && semicolons >= 8) ||
    (trimmed.length > 400 && semicolons >= 4);
  if (looksLikeObjectDump) {
    const named = trimmed.match(/^([A-Z][A-Za-z0-9_]*)\s*&/);
    if (named?.[1]) return named[1];
    return '{ … }';
  }
  return trimmed.length > 400 ? `${trimmed.slice(0, 160).trimEnd()}…` : type;
}

let cachedPreviews: Map<string, TypePreviewData> | null = null;

export function stripJsDocLinks(text: string): string {
  return text
    .replace(/\{@link\s+([^}\s]+)(?:\s+([^}]+))?\}/g, (_all, target: string, label?: string) => {
      if (label?.trim()) return label.trim();
      const sep = target.includes('#') ? '#' : target.includes('.') ? '.' : '';
      return sep ? target.slice(target.indexOf(sep) + 1) : target;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueNamed<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

export function symbolHref(kind: TypePreviewKind, name: string): string {
  return `/docs/${kind}/${name}/`;
}

export function previewFromSymbol(symbol: DocSymbol): TypePreviewData {
  const href = symbolHref(symbol.kind, symbol.name);
  const description = symbol.description ? stripJsDocLinks(symbol.description) : undefined;

  if (symbol.kind === 'enum') {
    const members = symbol.members ?? [];
    return {
      name: symbol.name,
      kind: 'enum',
      href,
      description,
      members: members.slice(0, PREVIEW_LIMIT).map((m) => ({
        name: m.name,
        detail: JSON.stringify(m.value),
      })),
      more: Math.max(0, members.length - PREVIEW_LIMIT),
    };
  }

  if (symbol.kind === 'interface') {
    const props = symbol.properties ?? [];
    const unions = symbol.unionMembers ?? [];
    if (props.length === 0 && unions.length) {
      return {
        name: symbol.name,
        kind: 'interface',
        href,
        description,
        signature:
          symbol.typeSignature && symbol.typeSignature.length <= MAX_PREVIEW_SIGNATURE
            ? symbol.typeSignature
            : undefined,
        members: unions.slice(0, PREVIEW_LIMIT).map((m) => ({
          name: typeof m.value === 'string' ? `'${m.value}'` : String(m.value),
          detail: '',
        })),
        more: Math.max(0, unions.length - PREVIEW_LIMIT),
      };
    }
    return {
      name: symbol.name,
      kind: 'interface',
      href,
      description,
      signature:
        symbol.typeSignature && symbol.typeSignature.length <= MAX_PREVIEW_SIGNATURE
          ? symbol.typeSignature
          : undefined,
      members: props.slice(0, PREVIEW_LIMIT).map((p) => ({
        name: `${p.name}${p.optional ? '?' : ''}`,
        detail: p.type,
      })),
      more: Math.max(0, props.length - PREVIEW_LIMIT),
    };
  }

  const props = uniqueNamed(symbol.properties ?? []);
  const methods = uniqueNamed(symbol.methods ?? []);
  const listed = [
    ...props.slice(0, 6).map((p) => ({
      name: p.name,
      detail: p.type,
    })),
    ...methods.slice(0, 6).map((m) => ({
      name: `${m.name}()`,
      detail: m.returns,
    })),
  ].slice(0, PREVIEW_LIMIT);

  return {
    name: symbol.name,
    kind: 'class',
    href,
    description,
    members: listed,
    more: Math.max(0, props.length + methods.length - listed.length),
  };
}

export function getTypePreviewMap(): Map<string, TypePreviewData> {
  if (process.env.NODE_ENV !== 'development' && cachedPreviews) return cachedPreviews;
  const map = new Map<string, TypePreviewData>();
  for (const symbol of getAllSymbols()) {
    map.set(symbol.name, previewFromSymbol(symbol));
  }
  cachedPreviews = map;
  return map;
}

export function getTypePreview(name: string): TypePreviewData | undefined {
  return getTypePreviewMap().get(name);
}

export function previewForHref(href: string): TypePreviewData | undefined {
  const match = href.match(/\/docs\/(?:v\/[^/]+\/)?(class|interface|enum)\/([^/#]+)/);
  if (!match?.[2]) return undefined;
  return getTypePreview(decodeURIComponent(match[2]));
}
