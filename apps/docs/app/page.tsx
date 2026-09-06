import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CodeBlock } from '@/components/CodeBlock';
import { CopyButton } from '@/components/CopyButton';
import { DownloadsStat } from '@/components/DownloadsStat';
import { HelpCallout } from '@/components/FluxerInvite';
import { FluxerLogo } from '@/components/FluxerLogo';
import { ApiName } from '@/components/MdxInlineCode';
import { SearchShortcutKbd } from '@/components/SearchShortcutKbd';
import { Button } from '@/components/ui/button';
import { loadApiDocs, loadVersions } from '@/lib/api-docs';
import { getExamples } from '@/lib/examples';
import { GUIDE_TASKS } from '@/lib/guide-meta';
import { loadOpenApi } from '@/lib/openapi';

const INSTALL_CMD = 'pnpm add @fluxerjs/core';

const SNIPPET = `import { Client, Events } from '@fluxerjs/core';

const client = new Client();

client.on(Events.Ready, () => {
  console.log('Ready!');
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`;

const startHere = [
  {
    href: '/guides/installation/',
    kicker: 'First time',
    title: 'Installation',
    description: 'Node 22.13 or newer, one package, one token, and a client that logs in.',
  },
  {
    href: '/guides/basic-bot/',
    kicker: 'Next',
    title: 'Basic bot',
    description: 'Wait for Ready, match !ping, reply. Everything else builds on this file.',
  },
  {
    href: '/guides/prefix-commands/',
    kicker: 'Commands',
    title: 'Prefix commands',
    description: 'Parse !commands, reply, and grow from a single file into a map of handlers.',
  },
  {
    href: '/guides/where-do-i/',
    kicker: 'Look up',
    title: 'Where do I…?',
    description: 'A task index that jumps to the guide and method for the job.',
  },
];

const capabilities: { title: string; href: string; body: React.ReactNode }[] = [
  {
    title: 'Gateway events',
    href: '/guides/events/',
    body: (
      <>
        Subscribe with <ApiName>client.on</ApiName> and handlers get typed payloads. Reconnects and
        resumes happen without you watching the socket.
      </>
    ),
  },
  {
    title: 'Call methods on objects',
    href: '/guides/channels/',
    body: (
      <>
        Fetch a thing and call methods on it: <ApiName>message.reply</ApiName>,{' '}
        <ApiName>channel.send</ApiName>, <ApiName>member.kick</ApiName>.
      </>
    ),
  },
  {
    title: 'Caching you can see',
    href: '/guides/caching/',
    body: (
      <>
        Managers cover the day-to-day reads. <ApiName>client.cache</ApiName> is where the per-cache
        limits, sweeps, and stats live when memory starts to matter.
      </>
    ),
  },
  {
    title: 'Builders that serialize themselves',
    href: '/guides/builders/',
    body: (
      <>
        Pass an <ApiName>EmbedBuilder</ApiName> or <ApiName>AttachmentBuilder</ApiName> straight
        into <ApiName>channel.send</ApiName>. No <ApiName>toJSON</ApiName> call of your own.
      </>
    ),
  },
  {
    title: 'Collectors with bounds',
    href: '/guides/collectors/',
    body: (
      <>
        <ApiName>awaitMessages</ApiName> and <ApiName>awaitReactions</ApiName> for confirmations and
        polls. A collector without <code className="font-mono">time</code> or{' '}
        <code className="font-mono">max</code> throws instead of leaking.
      </>
    ),
  },
  {
    title: 'Permission checks',
    href: '/guides/permissions/',
    body: (
      <>
        <ApiName>member.permissions</ApiName> for guild-level roles,{' '}
        <ApiName>member.permissionsIn</ApiName> when channel overwrites decide the answer.
      </>
    ),
  },
];

const TASK_COUNT = 12;

export default async function HomePage(): Promise<React.ReactElement> {
  const { latest } = loadVersions();
  const docs = loadApiDocs();
  const symbolCount = docs.classes.length + docs.interfaces.length + docs.enums.length;

  let operationCount = 0;
  try {
    operationCount = loadOpenApi().operations.length;
  } catch {
    // openapi.json is generated; missing during some builds
  }

  let exampleCount = 0;
  try {
    exampleCount = getExamples().length;
  } catch {
    // examples/ is outside the app and may be absent in a static export
  }

  const reference = [
    {
      href: '/docs/',
      title: 'SDK reference',
      meta: symbolCount ? `${symbolCount} symbols` : 'Generated from source',
      description: 'Classes, methods, properties, and types, pulled out of the published source.',
    },
    {
      href: '/rest/',
      title: 'REST API',
      meta: operationCount ? `${operationCount} operations` : 'OpenAPI',
      description: 'Endpoints, request bodies, and response schemas for when you go under the SDK.',
    },
    {
      href: '/examples/',
      title: 'Examples',
      meta: exampleCount ? `${exampleCount} bots` : 'Runnable bots',
      description: 'Whole programs you can copy and run, from a bare login up to sharding.',
    },
  ];

  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-[var(--content-pad)] py-16 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,30rem)] lg:items-center lg:gap-16">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <FluxerLogo className="h-9 w-9" />
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="text-lg font-semibold tracking-tight">Fluxer.js</span>
                <span className="font-mono text-sm text-muted-foreground">v{latest}</span>
              </div>
            </div>

            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Build bots for Fluxer
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Fluxer.js holds the gateway connection open, retries rate-limited requests, and caches
              the objects you touch. You write the handlers.
            </p>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
              There are no intents to declare. Construct a{' '}
              <ApiName className="font-mono text-foreground hover:underline">Client</ApiName>, log
              in with a bot token, and the events you subscribed to start arriving.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/guides/installation/">
                  Get started
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/guides/basic-bot/">Write a first bot</Link>
              </Button>
            </div>

            <div className="mt-8 flex max-w-md items-center gap-1 rounded-lg border border-border bg-card px-3 py-2">
              <Image
                src="/pnpm.svg"
                alt=""
                width={16}
                height={16}
                className="mr-1.5 h-4 w-4 shrink-0"
                unoptimized
              />
              <code className="min-w-0 flex-1 truncate font-mono text-sm">
                pnpm add <span className="text-primary">@fluxerjs/core</span>
              </code>
              <CopyButton code={INSTALL_CMD} />
            </div>

            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>Apache-2.0</span>
              <span aria-hidden>·</span>
              <span>Node 22.13+</span>
              <span aria-hidden>·</span>
              <span>Types included</span>
              <span aria-hidden>·</span>
              <Link href="/changelog/" className="hover:text-foreground hover:underline">
                Changelog
              </Link>
            </p>
          </div>

          <div className="min-w-0">
            <CodeBlock
              code={SNIPPET}
              lang="javascript"
              filename="bot.js"
              className="my-0 shadow-sm"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              A complete bot that replies to{' '}
              <code className="font-mono text-foreground">!ping</code>. See the{' '}
              <Link
                href="/examples/minimal-bot/"
                className="text-foreground underline-offset-2 hover:underline">
                shorter version
              </Link>{' '}
              or{' '}
              <Link
                href="/guides/prefix-commands/"
                className="text-foreground underline-offset-2 hover:underline">
                add real commands
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <DownloadsStat />

      <section className="mx-auto max-w-6xl px-[var(--content-pad)] py-14">
        <h2 className="text-xl font-semibold tracking-tight">Start here</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Install, write a first bot, then look up the rest.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {startHere.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-muted/40">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.kicker}
              </span>
              <h3 className="mt-2 font-semibold">
                {item.title}
                <ArrowRight
                  className="ml-1.5 inline h-3.5 w-3.5 -translate-x-0.5 text-muted-foreground transition-transform group-hover:translate-x-0 group-hover:text-primary"
                  aria-hidden
                />
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-[var(--content-pad)] py-14">
          <h2 className="text-xl font-semibold tracking-tight">What the library handles</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            The parts you would otherwise write yourself, and the guide for each.
          </p>
          <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <div key={item.href}>
                <h3 className="text-sm font-semibold">
                  <Link href={item.href} className="hover:text-primary hover:underline">
                    {item.title}
                  </Link>
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground [&_code]:text-[0.8125rem] [&_code]:text-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-[var(--content-pad)] py-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Look something up</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Or press <SearchShortcutKbd /> and search all of it at once.
            </p>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {reference.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group flex flex-col gap-1 py-4">
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-semibold group-hover:text-primary">
                        {item.title}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {item.meta}
                      </span>
                    </span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight">Where do I…?</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              When you know the task but not the page.
            </p>
            <ul className="mt-6 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {GUIDE_TASKS.slice(0, TASK_COUNT).map((item) => (
                <li key={item.task}>
                  <Link
                    href={`/guides/${item.slug}/`}
                    className="block py-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline">
                    {item.task}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/guides/where-do-i/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Full task map
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-[var(--content-pad)] pb-16">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">One thing to know about voice</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Guild voice channels are text-based, so{' '}
            <ApiName className="font-mono text-foreground hover:underline">channel.send</ApiName>{' '}
            already works in them. Actual audio lives in{' '}
            <code className="font-mono text-foreground">@fluxerjs/voice</code>, which is being
            reworked. Read the{' '}
            <Link
              href="/guides/voice/"
              className="font-medium text-foreground underline-offset-2 hover:underline">
              voice guide
            </Link>{' '}
            before you depend on it.
          </p>
        </div>
        <HelpCallout className="mt-3" />
      </section>
    </main>
  );
}
