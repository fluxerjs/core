import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getApiSidebarGroups } from '@/components/ApiNav';
import { CopyButton } from '@/components/CopyButton';
import { MemberFilter } from '@/components/MemberFilter';
import { OnPageToc, type TocHeading } from '@/components/OnPageToc';
import { PageShell } from '@/components/PageShell';
import { DocDescription, TypeText } from '@/components/TypeText';
import { buildAccessPathIndex, memberAccessPaths, preferredPath } from '@/lib/access-paths';
import { docsGitRef, githubSourceUrl, loadApiDocsFor } from '@/lib/api-docs';
import type {
  DocClass,
  DocEnum,
  DocInterface,
  DocInterfaceProperty,
  DocMethod,
  DocParam,
  DocProperty,
  DocSymbol,
} from '@/lib/doc-schema';
import { highlightCode } from '@/lib/highlight';
import type { JsDocLinkContext } from '@/lib/jsdoc-links';
import { collapseTypeDisplay } from '@/lib/type-preview';
import { cn } from '@/lib/utils';

export async function SdkSymbol({
  symbol,
  kind,
  version = 'latest',
  basePath = '/docs',
}: {
  symbol: DocSymbol;
  kind: string;
  version?: string;
  basePath?: string;
}): Promise<React.ReactElement> {
  const base = basePath.replace(/\/$/, '');
  const source = githubSourceUrl(symbol.source, docsGitRef(version));
  const jumpLinks = buildJumpLinks(symbol);
  const versionForNav = version === 'latest' ? undefined : version;
  const docs = loadApiDocsFor(versionForNav);
  const access = buildAccessPathIndex(docs);
  const memberPath = (memberName: string): string | undefined =>
    preferredPath(memberAccessPaths(symbol.name, memberName, access, docs.classes));
  const tocHeadings = buildMemberToc(symbol);
  const memberCount = countMembers(symbol);
  const linkContext: JsDocLinkContext = {
    name: symbol.name,
    members: [
      ...((symbol.kind === 'enum' ? symbol.members : symbol.properties)?.map((m) => m.name) ?? []),
      ...((symbol.kind === 'enum' ? [] : symbol.methods)?.map((m) => m.name) ?? []),
    ],
  };
  const kindLabel = kind === 'class' ? 'Class' : kind === 'enum' ? 'Enum' : 'Interface';

  return (
    <PageShell
      sidebarTitle="SDK Reference"
      sidebarGroups={getApiSidebarGroups(kind, symbol.name, basePath, versionForNav)}
      toc={<OnPageToc headings={tocHeadings} sectionsOnly />}
      wide>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`${base}/`} className="transition-colors hover:text-foreground">
          SDK
        </Link>
        <span className="text-border">/</span>
        <Link
          href={`${base}/#${kind}`}
          className="capitalize transition-colors hover:text-foreground">
          {kindLabel}
        </Link>
      </nav>

      <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {kindLabel}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{symbol.name}</h1>

      {symbol.description ? (
        <DocDescription
          text={symbol.description}
          linkContext={linkContext}
          className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground"
        />
      ) : null}

      {symbol.kind === 'interface' && symbol.extends?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Extends{' '}
          {symbol.extends.map((ext, i) => (
            <span key={ext}>
              {i > 0 ? ', ' : null}
              <TypeText type={ext} className="font-mono text-[13px]" />
            </span>
          ))}
        </p>
      ) : null}
      {symbol.kind === 'class' && symbol.extends ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Extends <TypeText type={symbol.extends} className="font-mono text-[13px]" />
        </p>
      ) : null}

      <nav className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {jumpLinks.map((j) => (
          <a key={j.id} href={`#${j.id}`} className="text-muted-foreground hover:text-foreground">
            {j.label}
            <span className="ml-1 font-mono text-[11px] text-muted-foreground/70">{j.count}</span>
          </a>
        ))}
        {source ? (
          <a
            href={source}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-3 w-3" aria-hidden />
            Source
          </a>
        ) : null}
      </nav>

      <MemberFilter enabled={memberCount > 8} />

      {symbol.kind === 'class' ? (
        <ClassBody symbol={symbol} memberPath={memberPath} linkContext={linkContext} />
      ) : null}
      {symbol.kind === 'interface' ? (
        <InterfaceBody symbol={symbol} linkContext={linkContext} />
      ) : null}
      {symbol.kind === 'enum' ? <EnumBody symbol={symbol} /> : null}
    </PageShell>
  );
}

function isFunctionMapProperties(properties: Array<{ type: string }>): boolean {
  if (properties.length < 8) return false;
  const fns = properties.filter((p) => p.type.includes('=>')).length;
  return fns / properties.length >= 0.8;
}

function propertiesHeading(properties: Array<{ type: string }>): string {
  return isFunctionMapProperties(properties) ? 'Path helpers' : 'Properties';
}

function buildJumpLinks(
  symbol: DocClass | DocInterface | DocEnum,
): { id: string; label: string; count: number }[] {
  const links: { id: string; label: string; count: number }[] = [];
  if (symbol.kind === 'class') {
    if (symbol.constructor) links.push({ id: 'constructor', label: 'Constructor', count: 1 });
    if (symbol.properties?.length)
      links.push({ id: 'properties', label: 'Properties', count: symbol.properties.length });
    if (symbol.methods?.length)
      links.push({ id: 'methods', label: 'Methods', count: uniqueMethodCount(symbol.methods) });
  } else if (symbol.kind === 'interface') {
    if (symbol.unionMembers?.length)
      links.push({ id: 'members', label: 'Members', count: symbol.unionMembers.length });
    if (symbol.examples?.length)
      links.push({ id: 'usage', label: 'Usage', count: symbol.examples.length });
    if (symbol.properties?.length)
      links.push({
        id: 'properties',
        label: propertiesHeading(symbol.properties),
        count: symbol.properties.length,
      });
    if (symbol.methods?.length)
      links.push({ id: 'methods', label: 'Methods', count: uniqueMethodCount(symbol.methods) });
  } else if (symbol.members?.length) {
    links.push({ id: 'members', label: 'Members', count: symbol.members.length });
  }
  return links;
}

function uniqueMethodCount(methods: DocMethod[]): number {
  return new Set(methods.map((m) => m.name)).size;
}

function countMembers(symbol: DocClass | DocInterface | DocEnum): number {
  if (symbol.kind === 'enum') return symbol.members?.length ?? 0;
  return (symbol.properties?.length ?? 0) + uniqueMethodCount(symbol.methods ?? []);
}

function uniqueMethodNames(methods: DocMethod[]): DocMethod[] {
  const seen = new Set<string>();
  return methods.filter((m) => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });
}

function methodClusters(methods: DocMethod[]): { method: DocMethod; signatures: DocMethod[] }[] {
  const groups = new Map<string, DocMethod[]>();
  for (const method of methods) {
    const list = groups.get(method.name) ?? [];
    list.push(method);
    groups.set(method.name, list);
  }
  return [...groups.values()].map((signatures) => ({
    method: signatures.find((s) => s.description) ?? signatures[0]!,
    signatures,
  }));
}

function buildMemberToc(symbol: DocClass | DocInterface | DocEnum): TocHeading[] {
  const headings: TocHeading[] = [];
  if (symbol.kind === 'class') {
    if (symbol.constructor) headings.push({ id: 'constructor', text: 'Constructor', depth: 2 });
    if (symbol.properties?.length)
      headings.push({ id: 'properties', text: 'Properties', depth: 2 });
    if (symbol.methods?.length) headings.push({ id: 'methods', text: 'Methods', depth: 2 });
  } else if (symbol.kind === 'interface') {
    if (symbol.examples?.length) headings.push({ id: 'usage', text: 'Usage', depth: 2 });
    if (symbol.typeSignature && collapseTypeDisplay(symbol.typeSignature) !== '{ … }') {
      headings.push({ id: 'type', text: 'Type', depth: 2 });
    }
    if (symbol.unionMembers?.length) headings.push({ id: 'members', text: 'Members', depth: 2 });
    if (symbol.properties?.length)
      headings.push({
        id: 'properties',
        text: propertiesHeading(symbol.properties),
        depth: 2,
      });
    if (symbol.methods?.length) headings.push({ id: 'methods', text: 'Methods', depth: 2 });
    if (symbol.see?.length) headings.push({ id: 'see-also', text: 'See also', depth: 2 });
  } else if (symbol.members?.length) {
    headings.push({ id: 'members', text: 'Members', depth: 2 });
  }
  return headings;
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactElement {
  return <h2 className="mb-3 text-lg font-semibold tracking-tight text-foreground">{children}</h2>;
}

async function ClassBody({
  symbol,
  memberPath,
  linkContext,
}: {
  symbol: DocClass;
  memberPath: (name: string) => string | undefined;
  linkContext: JsDocLinkContext;
}): Promise<React.ReactElement> {
  const properties = symbol.properties ?? [];
  const methods = methodClusters(symbol.methods ?? []);
  const ctorParams = symbol.constructor?.params ?? [];
  return (
    <div className="mt-10 space-y-12" data-member-root>
      {symbol.constructor ? (
        <section id="constructor" className="scroll-mt-24">
          <SectionHeading>Constructor</SectionHeading>
          {symbol.constructor.description ? (
            <DocDescription
              text={symbol.constructor.description}
              linkContext={linkContext}
              className="mb-3 text-sm leading-6 text-muted-foreground"
            />
          ) : null}
          <Snippet
            code={`new ${symbol.name}(${ctorParams.map(formatParam).join(', ')})`}
            lang="typescript"
          />
          {ctorParams.length ? <ParamsTable params={ctorParams} /> : null}
        </section>
      ) : null}
      {properties.length ? (
        <section id="properties" className="scroll-mt-24">
          <SectionHeading>Properties</SectionHeading>
          <PropertyTable
            properties={properties}
            linkContext={linkContext}
            memberPath={memberPath}
          />
        </section>
      ) : null}
      {methods.length ? (
        <section id="methods" className="scroll-mt-24">
          <SectionHeading>Methods</SectionHeading>
          <MethodIndex methods={methods.map((m) => m.method)} />
          <div className="divide-y divide-border border-y border-border">
            {methods.map(({ method, signatures }) => (
              <MethodBlock
                key={method.name}
                method={method}
                signatures={signatures}
                ownerName={symbol.name}
                usage={method.static ? `${symbol.name}.${method.name}` : memberPath(method.name)}
                linkContext={linkContext}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

async function InterfaceBody({
  symbol,
  linkContext,
}: {
  symbol: DocInterface;
  linkContext: JsDocLinkContext;
}): Promise<React.ReactElement> {
  const properties = symbol.properties ?? [];
  const methods = symbol.methods ?? [];
  const unionMembers = symbol.unionMembers ?? [];
  const examples = symbol.examples ?? [];
  const typeSignature = symbol.typeSignature
    ? collapseTypeDisplay(symbol.typeSignature)
    : undefined;
  const showType = Boolean(typeSignature && typeSignature !== '{ … }');
  return (
    <div className="mt-10 space-y-12" data-member-root>
      {examples.length ? (
        <section id="usage" className="scroll-mt-24">
          <SectionHeading>Usage</SectionHeading>
          {examples.map((example) => (
            <Snippet key={example} code={example} lang="typescript" />
          ))}
        </section>
      ) : null}
      {showType ? (
        <section id="type" className="scroll-mt-24">
          <SectionHeading>Type</SectionHeading>
          <Snippet code={typeSignature!} lang="typescript" />
        </section>
      ) : null}
      {unionMembers.length ? (
        <section id="members" className="scroll-mt-24">
          <SectionHeading>Members</SectionHeading>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {unionMembers.map((m) => (
                  <tr key={String(m.value)} className="border-t border-border">
                    <td className="px-3 py-2">
                      <TypeText
                        type={typeof m.value === 'string' ? `'${m.value}'` : String(m.value)}
                        className="font-mono text-sm text-emerald-600 dark:text-emerald-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {properties.length || (!showType && !unionMembers.length) ? (
        <section id="properties" className="scroll-mt-24">
          <SectionHeading>{propertiesHeading(properties)}</SectionHeading>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documented properties.</p>
          ) : (
            <PropertyTable properties={properties} linkContext={linkContext} />
          )}
        </section>
      ) : null}
      {methods.length ? (
        <section id="methods" className="scroll-mt-24">
          <SectionHeading>Methods</SectionHeading>
          <MethodIndex methods={uniqueMethodNames(methods)} />
          <div className="divide-y divide-border border-y border-border">
            {methodClusters(methods).map(({ method, signatures }) => (
              <MethodBlock
                key={method.name}
                method={method}
                signatures={signatures}
                ownerName={symbol.name}
                linkContext={linkContext}
              />
            ))}
          </div>
        </section>
      ) : null}
      {symbol.see?.length ? (
        <section id="see-also" className="scroll-mt-24">
          <SectionHeading>See also</SectionHeading>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {symbol.see.map((s) => (
              <li key={s}>
                <DocDescription text={s} className="inline" as="span" linkContext={linkContext} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function EnumBody({ symbol }: { symbol: DocEnum }): React.ReactElement {
  const members = symbol.members ?? [];
  return (
    <section id="members" className="mt-10 scroll-mt-24" data-member-root>
      <SectionHeading>Members</SectionHeading>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.name}
                id={m.name}
                data-member={m.name.toLowerCase()}
                className="scroll-mt-24 border-t border-border">
                <td className="px-3 py-2 font-mono font-medium">{m.name}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {JSON.stringify(m.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function PropertyTable({
  properties,
  linkContext,
  memberPath,
}: {
  properties: Array<DocProperty | DocInterfaceProperty>;
  linkContext: JsDocLinkContext;
  memberPath?: (name: string) => string | undefined;
}): Promise<React.ReactElement> {
  const helpers = isFunctionMapProperties(properties);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-[1%] whitespace-nowrap px-3 py-2">Name</th>
            <th className="min-w-[9rem] px-3 py-2">{helpers ? 'Signature' : 'Type'}</th>
            <th className="px-3 py-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => {
            const examples = 'examples' in p ? p.examples : undefined;
            return (
              <tr
                key={p.name}
                id={p.name}
                data-member={`${p.name} ${'static' in p && p.static ? 'static' : ''} ${p.description ?? ''} ${memberPath?.(p.name) ?? ''} ${(examples ?? []).join(' ')}`.toLowerCase()}
                className="scroll-mt-24 border-t border-border align-top">
                <td className="whitespace-nowrap px-3 py-2.5 font-mono">
                  <a href={`#${p.name}`} className="font-medium hover:underline">
                    {p.name}
                  </a>
                  {p.optional ? <span className="text-muted-foreground">?</span> : null}
                  {'static' in p && p.static ? (
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                      static
                    </span>
                  ) : null}
                  {'readonly' in p && p.readonly ? (
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                      read-only
                    </span>
                  ) : null}
                </td>
                <td className="max-w-[min(100%,28rem)] px-3 py-2.5">
                  <TypeText type={p.type} className="break-words font-mono text-[13px]" />
                </td>
                <td className="min-w-0 px-3 py-2.5 text-muted-foreground">
                  {p.description ? (
                    <DocDescription
                      text={p.description}
                      className="m-0 whitespace-normal break-words"
                      as="span"
                      linkContext={linkContext}
                    />
                  ) : null}
                  {examples?.length
                    ? examples.map((example) => (
                        <Snippet key={example} code={example} lang="typescript" />
                      ))
                    : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MethodIndex({ methods }: { methods: DocMethod[] }): React.ReactElement {
  return (
    <nav aria-label="Method index" className="mb-5 columns-2 gap-x-6 sm:columns-3">
      {methods.map((m) => (
        <a
          key={m.name}
          href={`#${m.name}`}
          data-member={m.name.toLowerCase()}
          className="mb-1 block break-all font-mono text-[13px] leading-5 text-muted-foreground hover:text-foreground hover:underline">
          {m.name}
        </a>
      ))}
    </nav>
  );
}

async function MethodBlock({
  method,
  signatures,
  ownerName,
  usage,
  linkContext,
}: {
  method: DocMethod;
  signatures?: DocMethod[];
  ownerName?: string;
  usage?: string;
  linkContext: JsDocLinkContext;
}): Promise<React.ReactElement> {
  const variants = signatures?.length ? signatures : [method];
  const params = method.params ?? [];
  const described = params.filter((p) => p.description);
  const example = method.examples?.[0] ?? variants.find((s) => s.examples?.[0])?.examples?.[0];
  const callName = method.static && ownerName ? `${ownerName}.${method.name}` : usage;
  const fallback =
    !example && callName
      ? `${method.async ? 'await ' : ''}${callName}(${params
          .filter((p) => !p.optional)
          .map((p) => p.name)
          .join(', ')});`
      : undefined;
  const snippet = example ?? fallback;
  const headingParams = params.map((p) => `${p.name}${p.optional ? '?' : ''}`).join(', ');
  const headingPrefix = method.static ? 'static ' : '.';

  return (
    <article
      id={method.name}
      data-member={`${method.name} ${method.static ? 'static' : ''} ${callName ?? ''} ${method.returns} ${method.description ?? ''}`.toLowerCase()}
      className="min-w-0 scroll-mt-24 py-6">
      <h3 className="break-words font-mono text-[15px] font-semibold tracking-tight">
        <a href={`#${method.name}`} className="hover:underline">
          {`${headingPrefix}${method.name}(${headingParams})`}
        </a>
      </h3>
      {variants.map((sig, i) => (
        <MethodSignature key={`${sig.name}-${i}`} method={sig} />
      ))}
      {method.deprecated ? (
        <p className="mt-2 inline-flex rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">
          Deprecated{typeof method.deprecated === 'string' ? `: ${method.deprecated}` : ''}
        </p>
      ) : null}
      {method.description ? (
        <DocDescription
          text={method.description}
          linkContext={linkContext}
          className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"
        />
      ) : null}
      {described.length ? <ParamsTable params={params} /> : null}
      {snippet ? <Snippet code={snippet} lang="javascript" /> : null}
    </article>
  );
}

function MethodSignature({ method }: { method: DocMethod }): React.ReactElement {
  const params = method.params ?? [];
  return (
    <p className="mt-1.5 min-w-0 break-words font-mono text-[13px] leading-6">
      {params.length ? (
        <>
          {params.map((p, i) => (
            <span key={`${p.name}-${i}`}>
              {i > 0 ? <span className="text-muted-foreground">, </span> : null}
              <span className="text-muted-foreground">
                {p.name}
                {p.optional ? '?' : null}:{' '}
              </span>
              <TypeText type={p.type} className="break-words font-mono text-[13px]" />
            </span>
          ))}
          <span className="text-muted-foreground"> → </span>
        </>
      ) : (
        <span className="text-muted-foreground">→ </span>
      )}
      <TypeText type={method.returns} className="break-words font-mono text-[13px]" />
    </p>
  );
}

function formatParam(p: DocParam): string {
  return `${p.name}${p.optional ? '?' : ''}: ${p.type}`;
}

function ParamsTable({ params }: { params: DocParam[] }): React.ReactElement {
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {params.map((p) => (
        <div key={p.name} className="grid min-w-0 gap-x-4 sm:grid-cols-[minmax(7rem,auto)_1fr]">
          <dt className="font-mono text-[13px]">
            {p.name}
            {p.optional ? <span className="text-muted-foreground">?</span> : null}
          </dt>
          <dd className="min-w-0">
            <TypeText type={p.type} className="break-words font-mono text-[13px]" />
            {p.description ? (
              <DocDescription
                text={p.description}
                className="mt-0.5 block text-muted-foreground"
                as="span"
              />
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

async function Snippet({
  code,
  lang = 'javascript',
}: {
  code: string;
  lang?: string;
}): Promise<React.ReactElement> {
  const source = code.trim();
  const html = await highlightCode(source, lang);
  return (
    <div className="code-frame group relative mt-3 overflow-hidden rounded-md border border-border">
      <CopyButton
        code={source}
        className={cn(
          'absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100',
        )}
      />
      <div
        className="overflow-x-auto [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-3 [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:font-mono [&_code]:text-[13px] [&_code]:leading-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
