import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getGuidesSidebarGroups } from '@/components/GuidesNav';
import { PageShell } from '@/components/PageShell';
import { loadVersions } from '@/lib/api-docs';
import { CATEGORY_ORDER, GUIDE_TASKS, getCategoryBlurb, getCategoryLabel } from '@/lib/guide-meta';
import { getGuidesByCategory, guidesBasePath } from '@/lib/guides';

export function GuidesIndexContent({ version }: { version?: string }): React.ReactElement {
  const byCategory = getGuidesByCategory(version);
  const firstGuide = byCategory['getting-started']?.[0];
  const base = guidesBasePath(version);
  const label = version ?? loadVersions().latest;

  return (
    <PageShell
      sidebarTitle="Guides"
      sidebarGroups={getGuidesSidebarGroups(undefined, version)}
      wide>
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Guides</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Fluxer.js v{label}. Install and login first, then messages, channels, members, and
          permissions. Use the task list below when you know what you want to do but not which page
          to open.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {firstGuide ? (
            <Link
              href={`${base}/${firstGuide.slug}/`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Start with {firstGuide.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            href={`${base}/where-do-i/`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Where do I...?
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mb-12 scroll-mt-24" id="where-do-i">
        <h2 className="mb-1 text-sm font-semibold">Where do I…?</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Jump to a guide by task. The full map is on{' '}
          <Link
            href={`${base}/where-do-i/`}
            className="text-foreground underline-offset-2 hover:underline">
            Where do I...?
          </Link>
          .
        </p>
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {GUIDE_TASKS.map((item) => (
            <li key={item.task}>
              <Link
                href={`${base}/${item.slug}/`}
                className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                <span className="text-foreground">{item.task}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {item.slug}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-12">
        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory[cat];
          if (!list?.length) return null;
          const blurb = getCategoryBlurb(cat);
          return (
            <section key={cat} className="scroll-mt-24" id={cat}>
              <h2 className="mb-1 text-sm font-semibold">
                {getCategoryLabel(cat)}
                <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                  {list.length}
                </span>
              </h2>
              {blurb ? (
                <p className="mb-3 text-sm text-muted-foreground">{blurb}</p>
              ) : (
                <div className="mb-3" />
              )}
              <ul className="divide-y divide-border border-y border-border">
                {list.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`${base}/${g.slug}/`}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                      <span className="shrink-0 text-sm font-medium text-foreground sm:w-48">
                        {g.title}
                      </span>
                      <span className="text-sm leading-6 text-muted-foreground">
                        {g.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
