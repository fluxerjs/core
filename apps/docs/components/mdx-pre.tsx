import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { highlightCode, normalizeLang } from '@/lib/highlight';

function getText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getText).join('');
  if (isValidElement(node)) {
    return getText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function extractCodeMeta(children: ReactNode): { code: string; lang: string } {
  const nodes = Children.toArray(children);
  const codeEl = nodes.find(isValidElement) as
    | ReactElement<{ className?: string; children?: ReactNode }>
    | undefined;

  if (codeEl) {
    const className = codeEl.props.className ?? '';
    const match = /language-([\w#+-]+)/.exec(className);
    return {
      lang: normalizeLang(match?.[1] ?? 'text'),
      code: getText(codeEl.props.children).replace(/\n$/, ''),
    };
  }

  return { lang: 'text', code: getText(children).replace(/\n$/, '') };
}

/** MDX `pre` override. Shiki dual-theme highlighting. */
export async function MdxPre({
  children,
  ...rest
}: {
  children?: ReactNode;
  title?: string;
  'data-title'?: string;
}): Promise<React.ReactElement> {
  const { code, lang } = extractCodeMeta(children);
  const title =
    (typeof rest.title === 'string' && rest.title) ||
    (typeof rest['data-title'] === 'string' && rest['data-title']) ||
    lang;
  const html = await highlightCode(code, lang);

  return (
    <div
      className="code-frame group relative my-6 overflow-hidden rounded-lg border border-border not-prose"
      data-title={title}>
      <div className="flex h-9 items-center justify-between border-b border-border/70 bg-muted/50 px-3">
        <span className="truncate font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <CopyButton code={code} />
      </div>
      <div
        className="overflow-x-auto text-[13px] leading-6 [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent [&_pre]:p-4 [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
