import { Fragment } from 'react';

const TOKEN_RE =
  /(\b[A-Z][A-Za-z0-9_]+\b)|(\b[a-z][A-Za-z0-9_]*\b)|(\{|\}|\[|\]|\(|\)|\||&|,|<|>|\?|:|\.\.\.|=>|=|\s+|[^\sA-Za-z0-9_]+)/g;

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

/** Color a type string without links or hover cards. */
export function TypePlain({
  type,
  className,
}: {
  type: string;
  className?: string;
}): React.ReactElement {
  const parts: React.ReactNode[] = [];
  let key = 0;
  for (const m of type.matchAll(TOKEN_RE)) {
    const token = m[0];
    if (KEYWORDS.has(token)) {
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
