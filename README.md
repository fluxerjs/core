# @fluxerjs/core

SDK for building bots on [Fluxer](https://fluxer.app).

## Install

```bash
npm install @fluxerjs/core
```

## Usage

```javascript
import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.Ready, () => console.log('Ready'));
client.on(Events.MessageCreate, async (m) => {
  if (m.content === '!ping') await m.reply('Pong');
});

await client.login(process.env.FLUXER_BOT_TOKEN);
```

See [`examples/ping-bot.js`](./examples/ping-bot.js) for voice, embeds, and more.

## Documentation

The docs site is a custom Vue app that pulls API docs from the SDK via a custom docgen (TypeScript Compiler API).

**From the repo root:**

```bash
# Dev server — http://localhost:3333
pnpm run docs:dev

# Generate docs JSON + build the site
pnpm run docs:build

# Preview the production build
pnpm run docs:preview
```

**What each command does:**

- `docs:dev` — Start Vite dev server; loads `public/docs/main.json` at runtime
- `docs:build` — Runs `generate:docs` (merges all packages into one JSON) then builds the site
- `docs:preview` — Serves the built site for testing

## License

Apache-2.0
