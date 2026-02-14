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

## License

AGPL-3.0
