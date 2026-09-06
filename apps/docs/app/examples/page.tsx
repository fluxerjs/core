import { ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { HelpCallout } from '@/components/FluxerInvite';
import { PageShell } from '@/components/PageShell';
import { EXAMPLES_REPO, getExamples, getExamplesSidebarItems } from '@/lib/examples';

export const metadata = { title: 'Examples' };

export default function ExamplesPage(): React.ReactElement {
  let examples: ReturnType<typeof getExamples> = [];
  try {
    examples = getExamples();
  } catch {
    // static export / missing examples dir
  }

  const sidebarItems = getExamplesSidebarItems();

  return (
    <PageShell sidebarTitle="Examples" sidebarItems={sidebarItems} wide>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Examples</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Runnable programs from a minimal login to voice, sharding, and moderation. Source is also
          on GitHub.
        </p>
      </header>

      {examples.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {examples.map((ex) => (
            <li
              key={ex.file}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  <Link href={`/examples/${ex.slug}/`} className="hover:underline">
                    {ex.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{ex.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono">{ex.file}</span>
                <Link
                  href={`/examples/${ex.slug}/`}
                  className="inline-flex items-center gap-1 text-primary hover:underline">
                  View
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                <a
                  href={`${EXAMPLES_REPO}/${ex.file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground">
                  GitHub
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No example bots found in this build.</p>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Prefer a walkthrough? Start with the{' '}
        <Link
          href="/guides/basic-bot/"
          className="text-foreground underline-offset-2 hover:underline">
          basic bot guide
        </Link>
        .
      </p>
      <HelpCallout className="mt-6" />
    </PageShell>
  );
}
