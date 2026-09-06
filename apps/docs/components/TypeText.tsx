import { Fragment, type ReactNode } from 'react';
import { TypeLink } from '@/components/TypeLink';
import { getAllSymbols } from '@/lib/api-docs';
import { type JsDocLinkContext, parseJsDocLink } from '@/lib/jsdoc-links';
import { getTypePreview, previewForHref, collapseTypeDisplay } from '@/lib/type-preview';

export type SymbolIndex = Map<string, { kind: string; name: string; href: string }>;

let cachedIndex: SymbolIndex | null = null;

export function getSymbolIndex(): SymbolIndex {
  if (process.env.NODE_ENV !== 'development' && cachedIndex) return cachedIndex;
  const map: SymbolIndex = new Map();
  for (const s of getAllSymbols()) {
    const kind = s.kind === 'class' ? 'class' : s.kind === 'enum' ? 'enum' : 'interface';
    map.set(s.name, {
      kind,
      name: s.name,
      href: `/docs/${kind}/${s.name}/`,
    });
  }
  cachedIndex = map;
  return map;
}

const TOKEN_RE =
  /(\b[A-Z][A-Za-z0-9_]*\b)|(\b[a-z][A-Za-z0-9_]*\b)|(\{|\}|\[|\]|\(|\)|\||&|,|<|>|\?|:|\.\.\.|=>|=|\s+|[^\sA-Za-z0-9_]+)/g;

const KEYWORDS = new Set([
  'string',
  'number',
  'boolean',
  'void',
  'null',
  'undefined',
  'never',
  'any',
  'unknown',
  'object',
  'bigint',
  'symbol',
  'true',
  'false',
  'readonly',
  'unique',
  'keyof',
  'typeof',
  'infer',
  'extends',
  'in',
  'out',
  'as',
  'is',
  'asserts',
  'const',
]);

export function TypeText({
  type,
  className,
}: {
  type: string;
  className?: string;
}): React.ReactElement {
  const index = getSymbolIndex();
  const display = collapseTypeDisplay(type);
  const parts: React.ReactNode[] = [];
  let key = 0;
  const matches = display.matchAll(TOKEN_RE);

  for (const m of matches) {
    const token = m[0];
    const linked = index.get(token);
    if (linked && !KEYWORDS.has(token)) {
      parts.push(
        <TypeLink
          key={key++}
          href={linked.href}
          preview={getTypePreview(token)}
          className="text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:decoration-sky-600 dark:text-sky-400 dark:decoration-sky-400/30">
          {token}
        </TypeLink>,
      );
    } else if (KEYWORDS.has(token)) {
      parts.push(
        <span key={key++} className="text-pink-600 dark:text-pink-400">
          {token}
        </span>,
      );
    } else if (/^['"`]/.test(token) || /^[0-9]/.test(token)) {
      parts.push(
        <span key={key++} className="text-emerald-600 dark:text-emerald-400">
          {token}
        </span>,
      );
    } else {
      parts.push(<Fragment key={key++}>{token}</Fragment>);
    }
  }

  return <code className={className}>{parts.length ? parts : type}</code>;
}

function inlineCode(text: string, keyStart: number): { nodes: ReactNode[]; next: number } {
  const nodes: ReactNode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = keyStart;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    nodes.push(
      <code key={k++} className="rounded bg-muted px-1 font-mono text-[0.9em]">
        {m[1]}
      </code>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return { nodes, next: k };
}

function renderRichInline(text: string, linkContext?: JsDocLinkContext): ReactNode[] {
  const index = getSymbolIndex();
  const parts: ReactNode[] = [];
  const re = /\{@link\s+([^}\s]+)(?:\s+([^}]+))?\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const chunk = inlineCode(text.slice(last, m.index), k);
      parts.push(...chunk.nodes);
      k = chunk.next;
    }
    const parsed = parseJsDocLink(m[1]!, m[2], index, linkContext);
    if (parsed.href) {
      parts.push(
        <TypeLink
          key={k++}
          href={parsed.href}
          preview={previewForHref(parsed.href)}
          className="font-medium text-primary hover:underline">
          {parsed.label}
        </TypeLink>,
      );
    } else {
      parts.push(
        <code key={k++} className="rounded bg-muted px-1 font-mono text-[0.9em]">
          {parsed.label}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const chunk = inlineCode(text.slice(last), k);
    parts.push(...chunk.nodes);
  }
  return parts;
}

type DescriptionBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] };

function splitDescriptionBlocks(text: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ul') last.items.push(bullet[1]!);
      else blocks.push({ type: 'ul', items: [bullet[1]!] });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.type === 'p') last.text += ` ${line}`;
    else blocks.push({ type: 'p', text: line });
  }
  return blocks;
}

/** Render description text with `{@link Name}`, `` `code` ``, and simple lists. */
export function DocDescription({
  text,
  className,
  as: Tag = 'p',
  linkContext,
}: {
  text: string;
  className?: string;
  as?: 'p' | 'span';
  linkContext?: JsDocLinkContext;
}): React.ReactElement {
  const blocks = splitDescriptionBlocks(text);
  if (blocks.length <= 1 && blocks[0]?.type === 'p') {
    const parts = renderRichInline(blocks[0].text, linkContext);
    return <Tag className={className}>{parts.length ? parts : text}</Tag>;
  }
  if (blocks.length === 0) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="mt-2 list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{renderRichInline(item, linkContext)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className={i > 0 ? 'mt-2' : undefined}>
            {renderRichInline(block.text, linkContext)}
          </p>
        ),
      )}
    </div>
  );
}
