import { CopyButton } from '@/components/CopyButton';
import { highlightCode, normalizeLang } from '@/lib/highlight';
import { cn } from '@/lib/utils';

const LANG_ICONS: Record<string, string> = {
  typescript: 'TS',
  javascript: 'JS',
  tsx: 'TSX',
  jsx: 'JSX',
  json: '{}',
  bash: '>_',
  shell: '>_',
  sh: '>_',
  powershell: 'PS',
  http: 'HTTP',
  css: 'CSS',
  html: '<>',
  md: 'MD',
  mdx: 'MDX',
  python: 'PY',
  rust: 'RS',
  go: 'GO',
  yaml: 'YML',
  yml: 'YML',
  toml: 'TM',
  sql: 'SQL',
  diff: '±',
  text: 'TXT',
};

function langBadge(lang: string): string {
  return LANG_ICONS[lang] ?? lang.slice(0, 3).toUpperCase();
}

export async function CodeBlock({
  code,
  lang = 'typescript',
  className,
  showLang = true,
  filename,
}: {
  code: string;
  lang?: string;
  className?: string;
  showLang?: boolean;
  filename?: string;
}): Promise<React.ReactElement> {
  const normalized = normalizeLang(lang);
  const source = code.trimEnd();
  const html = await highlightCode(source, normalized);

  return (
    <div
      className={cn(
        'code-frame group relative my-5 overflow-hidden rounded-lg border border-border text-[13px] leading-6 sm:text-[13.5px]',
        className,
      )}>
      <div className="flex h-9 items-center justify-between border-b border-border/70 bg-muted/50 px-3">
        {filename ? (
          <span className="inline-flex items-center gap-2.5 text-[12px] text-muted-foreground">
            <span aria-hidden className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
            </span>
            <span className="font-mono text-foreground/80">{filename}</span>
          </span>
        ) : showLang ? (
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            <span
              aria-hidden
              className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/80 bg-background/80 px-1 text-[10px] font-semibold text-foreground/80">
              {langBadge(normalized)}
            </span>
            {normalized}
          </span>
        ) : (
          <span />
        )}
        <CopyButton code={source} />
      </div>
      <div
        className="overflow-x-auto [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-4 [&_code]:font-mono [&_code]:text-[13px] [&_code]:leading-6 sm:[&_code]:text-[13.5px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export async function SchemaBlock({
  schema,
  title,
}: {
  schema: unknown;
  title?: string;
}): Promise<React.ReactElement> {
  const code = JSON.stringify(schema, null, 2);
  const html = await highlightCode(code, 'json');

  return (
    <div className="code-frame group relative my-3 overflow-hidden rounded-lg border border-border">
      <div className="flex h-9 items-center justify-between border-b border-border/70 bg-muted/50 px-3">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          <span
            aria-hidden
            className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/80 bg-background/80 px-1 text-[10px] font-semibold text-foreground/80">
            {langBadge('json')}
          </span>
          {title ?? 'json'}
        </span>
        <CopyButton code={code} />
      </div>
      <div
        className="overflow-x-auto text-[12px] leading-5 sm:text-[12.5px] [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-3 [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
