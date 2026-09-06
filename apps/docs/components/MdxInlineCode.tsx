import { isValidElement, type ReactNode } from 'react';
import { TypeLink } from '@/components/TypeLink';
import { resolveProseIdentifier } from '@/lib/prose-links';
import { previewForHref } from '@/lib/type-preview';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return '';
}

/** MDX inline `code`: link Client methods, Events members, and structure calls to SDK pages. */
export function MdxInlineCode({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}): React.ReactElement {
  if (className) {
    return <code className={className}>{children}</code>;
  }
  const text = textOf(children);
  const hit = text ? resolveProseIdentifier(text) : undefined;
  if (!hit?.href) {
    return <code>{children}</code>;
  }
  return (
    <TypeLink
      href={hit.href}
      preview={previewForHref(hit.href)}
      className="font-medium text-primary no-underline hover:underline">
      <code>{children}</code>
    </TypeLink>
  );
}

/** Homepage / TSX prose where a known API name should link to its SDK page. */
export function ApiName({
  children,
  className,
}: {
  children: string;
  className?: string;
}): React.ReactElement {
  const hit = resolveProseIdentifier(children);
  const code = <code className={className}>{children}</code>;
  if (!hit?.href) return code;
  return (
    <TypeLink href={hit.href} preview={previewForHref(hit.href)} className="hover:underline">
      {code}
    </TypeLink>
  );
}
