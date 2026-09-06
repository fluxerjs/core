import { PageShell } from '@/components/PageShell';
import { RestExplorer, type RestExplorerOperation } from '@/components/RestExplorer';
import { getRestSidebarGroups } from '@/components/RestNav';
import { getOperationsByTag, loadOpenApi } from '@/lib/openapi';

export const metadata = { title: 'REST API' };

export default function RestIndexPage(): React.ReactElement {
  const api = loadOpenApi();
  const byTag = getOperationsByTag();
  const tags = Object.keys(byTag).sort();
  const operations: RestExplorerOperation[] = api.operations.map((op) => ({
    operationId: op.operationId,
    method: op.method,
    path: op.path,
    summary: op.summary,
    tag: op.tags[0] ?? 'Other',
    deprecated: op.deprecated,
  }));

  return (
    <PageShell sidebarTitle="REST API" sidebarGroups={getRestSidebarGroups()} wide>
      <header className="mb-8">
        <p className="mb-2 font-mono text-xs text-muted-foreground">OpenAPI {api.version}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{api.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {api.description ?? 'HTTP API reference generated from the OpenAPI specification.'}
        </p>
        {api.servers[0] ? (
          <p className="mt-5 inline-flex break-all rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-sm text-foreground">
            {api.servers[0].url}
          </p>
        ) : null}
      </header>

      <RestExplorer operations={operations} tags={tags} />
    </PageShell>
  );
}
