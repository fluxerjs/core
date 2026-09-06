import Link from 'next/link';
import { GitHubIcon } from '@/components/GitHubIcon';
import type { ChangelogEntry } from '@/data/changelog';
import { changelogEntries } from '@/data/changelog';
import { GITHUB_REPO, githubCompareUrl, githubPullUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Changelog' };

interface SectionStyle {
  heading: string;
  bar: string;
  dot: string;
}

const DEFAULT_STYLE: SectionStyle = {
  heading: 'text-foreground',
  bar: 'border-l-primary',
  dot: 'bg-primary',
};

function sectionStyle(title: string): SectionStyle {
  const t = title.toLowerCase();
  if (/(break|remov)/.test(t))
    return {
      heading: 'text-rose-600 dark:text-rose-400',
      bar: 'border-l-rose-500',
      dot: 'bg-rose-500',
    };
  if (/(add|new|feature)/.test(t))
    return {
      heading: 'text-emerald-700 dark:text-emerald-400',
      bar: 'border-l-emerald-500',
      dot: 'bg-emerald-500',
    };
  if (/(fix|patch|bug)/.test(t))
    return {
      heading: 'text-amber-700 dark:text-amber-400',
      bar: 'border-l-amber-500',
      dot: 'bg-amber-500',
    };
  if (/(chang|updat|improv|rewrite)/.test(t))
    return {
      heading: 'text-sky-700 dark:text-sky-400',
      bar: 'border-l-sky-500',
      dot: 'bg-sky-500',
    };
  if (/(doc)/.test(t))
    return {
      heading: 'text-violet-700 dark:text-violet-400',
      bar: 'border-l-violet-500',
      dot: 'bg-violet-500',
    };
  if (/(migrat)/.test(t))
    return {
      heading: 'text-orange-700 dark:text-orange-400',
      bar: 'border-l-orange-500',
      dot: 'bg-orange-500',
    };
  return DEFAULT_STYLE;
}

function githubHref(entry: ChangelogEntry, previous?: ChangelogEntry): string {
  if (entry.github) return entry.github;
  if (entry.pr) return githubPullUrl(entry.pr);
  if (previous) return githubCompareUrl(previous.version, entry.version);
  return `${GITHUB_REPO}/releases/tag/v${entry.version}`;
}

function githubLabel(entry: ChangelogEntry): string {
  return entry.pr ? `PR #${entry.pr}` : 'GitHub';
}

interface TextPiece {
  text: string;
  href?: string;
}

const GITHUB_REF = /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#(\d+)$/;
const GITHUB_HOST = /^https?:\/\/github\.com\//i;

function githubRefUrl(ownerRepo: string, n: string): string {
  return `https://github.com/${ownerRepo}/issues/${n}`;
}

/** Markdown `[label](href)`, owner/repo#123, bare `/guides/...`, and http(s) URLs. */
function linkify(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  const md = /\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)/g;
  const ranges: { start: number; end: number; label: string; href: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = md.exec(text)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      label: match[1]!,
      href: match[2]!,
    });
  }

  const pushBare = (chunk: string): void => {
    const bare =
      /(https?:\/\/[^\s]+)|(\/(?:guides|docs|examples|changelog|rest)\/[A-Za-z0-9_~#/=-]*)|(\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#\d+)/g;
    let i = 0;
    let m: RegExpExecArray | null;
    while ((m = bare.exec(chunk)) !== null) {
      if (m.index > i) pieces.push({ text: chunk.slice(i, m.index) });
      if (m[3]) {
        const ref = GITHUB_REF.exec(m[3]);
        pieces.push({
          text: m[3],
          href: ref ? githubRefUrl(ref[1]!, ref[2]!) : m[3],
        });
      } else {
        pieces.push({ text: (m[1] ?? m[2])!, href: (m[1] ?? m[2])! });
      }
      i = m.index + m[0].length;
    }
    if (i < chunk.length) pieces.push({ text: chunk.slice(i) });
  };

  let last = 0;
  for (const r of ranges) {
    if (r.start > last) pushBare(text.slice(last, r.start));
    pieces.push({ text: r.label, href: r.href });
    last = r.end;
  }
  if (last < text.length) pushBare(text.slice(last));
  return pieces.filter((p) => p.text.length > 0);
}

function ChangelogText({
  text,
  className,
}: {
  text: string;
  className?: string;
}): React.ReactElement {
  const pieces = linkify(text);
  return (
    <span className={className}>
      {pieces.map((p, i) => {
        if (!p.href) return <span key={i}>{p.text}</span>;
        const cls = 'text-primary underline-offset-2 hover:underline';
        if (p.href.startsWith('/')) {
          return (
            <Link key={i} href={p.href} className={cls}>
              {p.text}
            </Link>
          );
        }
        if (GITHUB_HOST.test(p.href)) {
          return (
            <a
              key={i}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap text-primary underline-offset-2 hover:underline">
              <GitHubIcon className="h-3.5 w-3.5" />
              {p.text}
            </a>
          );
        }
        return (
          <a key={i} href={p.href} target="_blank" rel="noreferrer" className={cls}>
            {p.text}
          </a>
        );
      })}
    </span>
  );
}

export default function ChangelogPage(): React.ReactElement {
  return (
    <main className="mx-auto w-full max-w-3xl px-[var(--content-pad)] py-12 sm:py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Changelog</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Features, fixes, and breaking changes in Fluxer.js.
        </p>
      </header>

      <div className="space-y-14">
        {changelogEntries.map((entry, index) => {
          const previous = changelogEntries[index + 1];
          const href = githubHref(entry, previous);
          return (
            <article key={entry.version} id={entry.version} className="scroll-mt-24">
              <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="font-mono text-xl font-semibold tracking-tight">v{entry.version}</h2>
                <time className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {entry.date}
                </time>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground">
                  <GitHubIcon className="h-4 w-4" />
                  {githubLabel(entry)}
                </a>
              </div>
              {entry.summary ? (
                <p className="mb-6 max-w-2xl text-sm leading-6 text-muted-foreground">
                  <ChangelogText text={entry.summary} />
                </p>
              ) : null}

              <div className="space-y-4">
                {entry.sections.map((section) => {
                  const style = sectionStyle(section.title);
                  return (
                    <section
                      key={section.title}
                      className={cn(
                        'rounded-md border border-border border-l-2 bg-card p-4',
                        style.bar,
                      )}>
                      <h3 className={cn('mb-3 text-sm font-semibold', style.heading)}>
                        {section.title}
                      </h3>
                      <ul className="space-y-3">
                        {section.items.map((item) => {
                          const summary = typeof item === 'string' ? item : item.summary;
                          const detail = typeof item === 'string' ? undefined : item.detail;
                          return (
                            <li key={summary} className="flex gap-3 text-sm leading-6">
                              <span
                                className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', style.dot)}
                                aria-hidden
                              />
                              <div className="space-y-1">
                                <ChangelogText
                                  text={summary}
                                  className={
                                    detail ? 'font-medium text-foreground' : 'text-muted-foreground'
                                  }
                                />
                                {detail ? (
                                  <p className="text-[0.8125rem] leading-6 text-muted-foreground">
                                    <ChangelogText text={detail} />
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
