# @fluxerjs/core

[![CI](https://github.com/fluxerjs/core/actions/workflows/ci.yml/badge.svg)](https://github.com/fluxerjs/core/actions/workflows/ci.yml)
[![CodeQL](https://github.com/fluxerjs/core/actions/workflows/codeql.yml/badge.svg)](https://github.com/fluxerjs/core/actions/workflows/codeql.yml)
[![npm version](https://img.shields.io/npm/v/@fluxerjs/core.svg)](https://www.npmjs.com/package/@fluxerjs/core)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Socket Badge](https://badge.socket.dev/npm/package/@fluxerjs/core/3.0.0)](https://badge.socket.dev/npm/package/@fluxerjs/core/3.0.0)

SDK for building bots on [Fluxer](https://fluxer.app).

## Install

```bash
pnpm add @fluxerjs/core
```

## Usage

Fluxer has no Discord-style gateway intents. Construct a client with no options (or only cache / instance options you need):

```javascript
import { Client, Events } from '@fluxerjs/core';

const client = new Client();

client.on(Events.Ready, () => console.log('Ready'));
client.on(Events.MessageCreate, async (m) => {
  if (m.content === '!ping') await m.reply('Pong');
});

await client.login(process.env.FLUXER_BOT_TOKEN);
```

## Documentation

Full guides, examples, REST reference, and SDK API docs: **[https://fluxer.js.org](https://fluxer.js.org)**

Start with [Installation](https://fluxer.js.org/guides/installation/) → [Basic bot](https://fluxer.js.org/guides/basic-bot/) → [Prefix commands](https://fluxer.js.org/guides/prefix-commands/) → [Errors](https://fluxer.js.org/guides/errors/) → [Caching](https://fluxer.js.org/guides/caching/).

Coming from discord.js? Read [From discord.js](https://fluxer.js.org/guides/from-discordjs/). Upgrading from 2.x? See [Upgrading to 3.0](https://fluxer.js.org/guides/upgrading-to-3/). Coming from 1.x? See [Migrating to 2.0](https://fluxer.js.org/guides/migration/) first.

**From this repo:**

```bash
# Dev server: http://localhost:3333
pnpm run docs:dev

# Build packages + generate docs + Next build
pnpm run docs:build

# Preview the production build
pnpm run docs:preview
```

- `docs:dev`: Next.js on port 3333
- `docs:build`: Generates API docs JSON, then builds the Next.js docs site (via turbo)
- `docs:preview`: `next start` on port 3333

## Next steps

- Runnable bots: [`examples/`](./examples/) (copy [`examples/.env.example`](./examples/.env.example))
- [Caching](https://fluxer.js.org/guides/caching/) when you care about memory and identity
- [Collectors](https://fluxer.js.org/guides/collectors/), [permissions](https://fluxer.js.org/guides/permissions/), [embeds](https://fluxer.js.org/guides/embeds/)

## Advanced: cluster and sharding

One `Client` = one Fluxer instance (token, REST, gateway, caches, CDN/invite URLs).
Each instance needs its **own** bot token.

**Beta:** `ClientCluster` can add/remove/restart runtimes without restarting the process.
The API may change; constructing a cluster emits a `FluxerClientClusterBeta` warning.
`restart(id, { token })` requires re-supplying the instance token (never stored).

```javascript
import { ClientCluster, ClientClusterEvents, Events } from '@fluxerjs/core';
// or: import { ClientCluster } from '@fluxerjs/core/cluster';

const cluster = new ClientCluster({
  configure(runtime) {
    runtime.client.on(Events.MessageCreate, async (m) => {
      if (m.content === '!ping') await m.reply(`Pong from ${runtime.id}`);
    });
  },
});

await cluster.add({ id: 'hosted', token: process.env.FLUXER_BOT_TOKEN });
await cluster.add({
  id: 'self',
  token: process.env.SELFHOST_BOT_TOKEN, // must be issued by the self-hosted instance
  discovery: 'https://api.my.instance',
});

// Later: no process restart
await cluster.restart('self', { token: process.env.SELFHOST_BOT_TOKEN });
await cluster.remove('self');
```

You can still manage raw `Client` instances yourself. See [`examples/multi-instance-bot.js`](./examples/multi-instance-bot.js) and the [multi-instance guide](https://fluxer.js.org/guides/multi-instance/).

For process-per-shard scaling, see [`@fluxerjs/sharding`](https://fluxer.js.org/guides/sharding/) and [`examples/sharded-bot.js`](./examples/sharded-bot.js).

## License

Apache-2.0
