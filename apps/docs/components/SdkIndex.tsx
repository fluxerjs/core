import type { LucideIcon } from 'lucide-react';
import { Boxes, Braces, Hash } from 'lucide-react';
import { getApiSidebarGroups } from '@/components/ApiNav';
import { PageShell } from '@/components/PageShell';
import { SdkCatalog, type SdkCatalogSection } from '@/components/SdkCatalog';
import { symbolMemberNames } from '@/lib/access-paths';
import type { DocClass, DocEnum, DocInterface, DocOutput } from '@/lib/doc-schema';

type Kind = 'class' | 'interface' | 'enum';

interface KindStyle {
  label: string;
  icon: LucideIcon;
}

const KIND: Record<Kind, KindStyle> = {
  class: { label: 'Classes', icon: Boxes },
  interface: { label: 'Interfaces', icon: Braces },
  enum: { label: 'Enums', icon: Hash },
};

function symbolMeta(kind: Kind, s: DocClass | DocInterface | DocEnum): string {
  if (kind === 'enum') {
    const n = (s as DocEnum).members?.length ?? 0;
    return `${n} ${n === 1 ? 'member' : 'members'}`;
  }
  const props = (s as DocClass | DocInterface).properties?.length ?? 0;
  const methods = (s as DocClass | DocInterface).methods?.length ?? 0;
  const parts: string[] = [];
  if (props) parts.push(`${props} ${props === 1 ? 'prop' : 'props'}`);
  if (methods) parts.push(`${methods} ${methods === 1 ? 'method' : 'methods'}`);
  return parts.join(' · ') || 'No members';
}

export function SdkIndex({
  docs,
  version = 'latest',
  basePath = '/docs',
}: {
  docs: DocOutput;
  version?: string;
  basePath?: string;
}): React.ReactElement {
  const raw: { kind: Kind; list: (DocClass | DocInterface | DocEnum)[] }[] = [
    { kind: 'class', list: docs.classes },
    { kind: 'interface', list: docs.interfaces },
    { kind: 'enum', list: docs.enums },
  ];
  const sections: SdkCatalogSection[] = raw.map(({ kind, list }) => ({
    kind,
    items: list.map((s) => ({
      id: s.id,
      name: s.name,
      pkg: s.package,
      meta: symbolMeta(kind, s),
      keywords: symbolMemberNames(s),
    })),
  }));

  return (
    <PageShell
      sidebarTitle="SDK Reference"
      sidebarGroups={getApiSidebarGroups(
        undefined,
        undefined,
        basePath,
        version === 'latest' ? undefined : version,
      )}
      wide>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">SDK reference</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Public classes, methods, and types generated from source. Search{' '}
          <span className="font-mono text-foreground">client.user.leaveGuild</span> from the header,
          or filter this page by class or method name.
        </p>
      </header>

      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        {raw.map(({ kind, list }) => {
          const style = KIND[kind];
          const Icon = style.icon;
          return (
            <a
              key={kind}
              href={`#${kind}`}
              className="group flex items-center gap-3 border border-border bg-card p-4 hover:bg-muted/40">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <div>
                <div className="text-2xl font-semibold leading-none tracking-tight">
                  {list.length}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{style.label}</div>
              </div>
            </a>
          );
        })}
      </div>

      <SdkCatalog sections={sections} basePath={basePath} />
    </PageShell>
  );
}
