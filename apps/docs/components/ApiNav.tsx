import { Boxes, Braces, Hash } from 'lucide-react';
import { DocsSidebar, type SidebarGroup, type SidebarItem } from '@/components/PageShell';
import { symbolMemberNames } from '@/lib/access-paths';
import { loadApiDocsFor } from '@/lib/api-docs';

function normalizeBasePath(basePath = '/docs'): string {
  return basePath.replace(/\/$/, '') || '/docs';
}

export function getApiSidebarItems(
  activeKind?: string,
  activeName?: string,
  basePath = '/docs',
  version?: string,
): SidebarItem[] {
  const docs = loadApiDocsFor(version);
  const base = normalizeBasePath(basePath);
  return [
    ...docs.classes.map((c) => ({
      href: `${base}/class/${c.name}/`,
      label: c.name,
      badge: 'class',
      active: activeKind === 'class' && activeName === c.name,
      keywords: symbolMemberNames(c),
    })),
    ...docs.interfaces.map((i) => ({
      href: `${base}/interface/${i.name}/`,
      label: i.name,
      badge: 'type',
      active: activeKind === 'interface' && activeName === i.name,
      keywords: symbolMemberNames(i),
    })),
    ...docs.enums.map((e) => ({
      href: `${base}/enum/${e.name}/`,
      label: e.name,
      badge: 'enum',
      active: activeKind === 'enum' && activeName === e.name,
      keywords: symbolMemberNames(e),
    })),
  ];
}

export function getApiSidebarGroups(
  activeKind?: string,
  activeName?: string,
  basePath = '/docs',
  version?: string,
): SidebarGroup[] {
  const docs = loadApiDocsFor(version);
  const base = normalizeBasePath(basePath);
  return [
    {
      id: 'classes',
      label: 'Classes',
      icon: <Boxes className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />,
      defaultOpen: !activeKind || activeKind === 'class',
      items: docs.classes.map((c) => ({
        href: `${base}/class/${c.name}/`,
        label: c.name,
        active: activeKind === 'class' && activeName === c.name,
        hint: c.package,
        keywords: symbolMemberNames(c),
      })),
    },
    {
      id: 'interfaces',
      label: 'Interfaces',
      icon: <Braces className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />,
      defaultOpen: activeKind === 'interface',
      items: docs.interfaces.map((i) => ({
        href: `${base}/interface/${i.name}/`,
        label: i.name,
        active: activeKind === 'interface' && activeName === i.name,
        keywords: symbolMemberNames(i),
      })),
    },
    {
      id: 'enums',
      label: 'Enums',
      icon: <Hash className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />,
      defaultOpen: activeKind === 'enum',
      items: docs.enums.map((e) => ({
        href: `${base}/enum/${e.name}/`,
        label: e.name,
        active: activeKind === 'enum' && activeName === e.name,
        keywords: symbolMemberNames(e),
      })),
    },
  ].filter((g) => g.items.length > 0);
}

export function ApiNav({
  activeKind,
  activeName,
  basePath = '/docs',
  version,
}: {
  activeKind?: string;
  activeName?: string;
  basePath?: string;
  version?: string;
}): React.ReactElement {
  return (
    <DocsSidebar
      title="SDK Reference"
      groups={getApiSidebarGroups(activeKind, activeName, basePath, version)}
    />
  );
}
