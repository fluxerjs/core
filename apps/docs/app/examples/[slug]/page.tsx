import { ExternalLink, FileCode2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CodeBlock } from '@/components/CodeBlock';
import { HelpCallout } from '@/components/FluxerInvite';
import { PageShell } from '@/components/PageShell';
import { EXAMPLES_REPO, getExample, getExamples, getExamplesSidebarItems } from '@/lib/examples';

export function generateStaticParams(): { slug: string }[] {
  return getExamples().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<{ title: string; description: string }> {
  const { slug } = await params;
  const ex = getExample(slug);
  return { title: ex?.title ?? 'Example', description: ex?.description ?? '' };
}

export default async function ExamplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const ex = getExample(slug);
  if (!ex) notFound();

  const all = getExamples();
  const idx = all.findIndex((e) => e.slug === slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <PageShell sidebarTitle="Examples" sidebarItems={getExamplesSidebarItems(slug)} wide>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileCode2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{ex.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {ex.file} · {ex.lines} lines
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{ex.description}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={`${EXAMPLES_REPO}/${ex.file}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <ExternalLink className="h-3 w-3" aria-hidden />
          View on GitHub
        </a>
        <span className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
          node examples/{ex.file}
        </span>
      </div>

      <div className="mt-8 min-w-0">
        <CodeBlock code={ex.code} lang="javascript" className="my-0" />
      </div>

      <nav className="mt-12 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/examples/${prev.slug}/`}
            className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Previous
            </span>
            <span className="mt-1 text-sm font-semibold transition-colors group-hover:text-primary">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/examples/${next.slug}/`}
            className="group flex flex-col rounded-xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 sm:col-start-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next
            </span>
            <span className="mt-1 text-sm font-semibold transition-colors group-hover:text-primary">
              {next.title}
            </span>
          </Link>
        ) : null}
      </nav>
      <HelpCallout className="mt-10" />
    </PageShell>
  );
}
