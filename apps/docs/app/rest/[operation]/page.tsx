import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SchemaBlock } from '@/components/CodeBlock';
import { PageShell } from '@/components/PageShell';
import { getRestSidebarGroups } from '@/components/RestNav';
import { getOperation, loadOpenApi } from '@/lib/openapi';
import { cn } from '@/lib/utils';

export function generateStaticParams(): { operation: string }[] {
  return loadOpenApi().operations.map((op) => ({ operation: op.operationId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ operation: string }>;
}): Promise<{ title: string }> {
  const { operation } = await params;
  const op = getOperation(operation);
  return { title: op?.summary ?? operation };
}

const METHOD_BADGE: Record<string, string> = {
  get: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  post: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  put: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  patch: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  delete: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

function statusStyle(status: string): string {
  if (status.startsWith('2')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (status.startsWith('3')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
  if (status.startsWith('4')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  if (status.startsWith('5')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
  return 'bg-muted text-muted-foreground';
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-xl font-semibold tracking-tight">
      <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </h2>
  );
}

export default async function RestOperationPage({
  params,
}: {
  params: Promise<{ operation: string }>;
}): Promise<React.ReactElement> {
  const { operation } = await params;
  const op = getOperation(operation);
  if (!op) notFound();

  const badge = METHOD_BADGE[op.method] ?? 'bg-muted text-foreground';

  return (
    <PageShell sidebarTitle="REST API" sidebarGroups={getRestSidebarGroups(op.operationId)} wide>
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/rest/" className="transition-colors hover:text-foreground">
          REST
        </Link>
        <span className="text-border">/</span>
        <span>{op.tags[0]}</span>
      </nav>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-md px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wide',
              badge,
            )}>
            {op.method}
          </span>
          <code className="break-all font-mono text-sm text-foreground">{op.path}</code>
          {op.deprecated ? (
            <span className="rounded bg-rose-500/10 px-2 py-0.5 font-mono text-xs text-rose-500">
              deprecated
            </span>
          ) : null}
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">{op.summary ?? op.operationId}</h1>
      {op.description ? (
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {op.description}
        </p>
      ) : null}
      <p className="mt-3 font-mono text-xs text-muted-foreground">{op.operationId}</p>

      {op.parameters.length ? (
        <section className="mt-12">
          <SectionHeading>Parameters</SectionHeading>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">In</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {op.parameters.map((p) => (
                  <tr
                    key={`${p.in}-${p.name}`}
                    className="border-t border-border transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono">
                      {p.name}
                      {p.required ? <span className="text-rose-500">*</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {p.in}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-sky-600 dark:text-sky-400">
                      {p.schema?.type ??
                        (p.schema?.$ref ? String(p.schema.$ref).split('/').pop() : '-')}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.description ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {op.requestBody?.schema ? (
        <section className="mt-12">
          <SectionHeading>Request body</SectionHeading>
          {op.requestBody.contentType ? (
            <p className="mb-2 font-mono text-xs text-muted-foreground">
              {op.requestBody.contentType}
            </p>
          ) : null}
          <SchemaBlock schema={op.requestBody.schema} />
        </section>
      ) : null}

      <section className="mt-12">
        <SectionHeading>Responses</SectionHeading>
        <div className="space-y-3">
          {op.responses.map((res) => (
            <div key={res.status} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 font-mono text-sm font-semibold',
                    statusStyle(res.status),
                  )}>
                  {res.status}
                </span>
                <p className="text-sm text-muted-foreground">{res.description}</p>
              </div>
              {res.schema ? (
                <div className="mt-3">
                  <SchemaBlock schema={res.schema} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
