import { BookOpen, Hash, History, type LucideIcon, MessageSquare, Wrench } from 'lucide-react';
import { DocsSidebar, type SidebarGroup, type SidebarItem } from '@/components/PageShell';
import { CATEGORY_ORDER, getCategoryLabel } from '@/lib/guide-meta';
import { getAllGuides, getGuidesByCategory, guidesBasePath } from '@/lib/guides';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'getting-started': BookOpen,
  popular: MessageSquare,
  guilds: Hash,
  additional: Wrench,
  upgrading: History,
  other: Wrench,
};

export function getGuidesSidebarItems(active?: string, version?: string): SidebarItem[] {
  const base = guidesBasePath(version);
  return getAllGuides(version).map((g) => ({
    href: `${base}/${g.slug}/`,
    label: g.title,
    active: g.slug === active,
  }));
}

export function getGuidesSidebarGroups(active?: string, version?: string): SidebarGroup[] {
  const base = guidesBasePath(version);
  const byCategory = getGuidesByCategory(version);
  return CATEGORY_ORDER.filter((cat) => (byCategory[cat]?.length ?? 0) > 0).map((cat) => {
    const Icon = CATEGORY_ICONS[cat] ?? Wrench;
    const list = byCategory[cat] ?? [];
    const hasActive = list.some((g) => g.slug === active);
    return {
      id: cat,
      label: getCategoryLabel(cat),
      icon: <Icon className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />,
      defaultOpen: hasActive || cat === 'getting-started',
      items: list.map((g) => ({
        href: `${base}/${g.slug}/`,
        label: g.title,
        active: g.slug === active,
      })),
    };
  });
}

export function GuidesNav({
  active,
  version,
}: {
  active?: string;
  version?: string;
}): React.ReactElement {
  return <DocsSidebar title="Guides" groups={getGuidesSidebarGroups(active, version)} />;
}
