import { INSTANCE_ALIASES } from './access-paths';

export interface JsDocLinkHit {
  href: string;
  name: string;
}

export interface JsDocLinkContext {
  name: string;
  members: Iterable<string>;
}

function memberLabel(typeName: string, member: string): string {
  const instance = INSTANCE_ALIASES[typeName]?.[0];
  return instance ? `${instance}.${member}` : `${typeName}.${member}`;
}

export function parseJsDocLink(
  target: string,
  label: string | undefined,
  index: { get(name: string): JsDocLinkHit | undefined },
  ctx?: JsDocLinkContext,
): { href?: string; label: string } {
  const trimmedLabel = label?.trim();
  if (/^https?:\/\//i.test(target)) {
    return { href: target, label: trimmedLabel || target };
  }
  if (target.startsWith('/') && !target.startsWith('//')) {
    return { href: target, label: trimmedLabel || target };
  }

  const members = new Set(ctx?.members ?? []);

  if (target.startsWith('#')) {
    const member = target.slice(1);
    return { href: `#${member}`, label: trimmedLabel || member };
  }

  const sep = target.includes('#') ? '#' : target.includes('.') ? '.' : '';
  if (!sep) {
    const hit = index.get(target);
    if (hit) return { href: hit.href, label: trimmedLabel || target };
    if (members.has(target)) {
      return { href: `#${target}`, label: trimmedLabel || target };
    }
    return { label: trimmedLabel || target };
  }

  const cut = target.indexOf(sep);
  const typeName = target.slice(0, cut);
  const member = target.slice(cut + 1);
  const display = trimmedLabel || memberLabel(typeName, member);
  const hit = index.get(typeName);
  if (hit) {
    return { href: `${hit.href}#${member}`, label: display };
  }
  if (members.has(member)) {
    return { href: `#${member}`, label: display };
  }
  return { label: display };
}
