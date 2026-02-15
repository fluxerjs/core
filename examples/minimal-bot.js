/**
 * Minimal Fluxer bot — login + !ping → Pong.
 * Usage: FLUXER_BOT_TOKEN=your_token node examples/minimal-bot.js
 *
 * See the Basic Bot guide: https://fluxerjs.blstmo.com/v/latest/guides/basic-bot
 */

import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.Ready, () => console.log('Ready!'));
client.on(Events.MessageCreate, async (m) => {
  if (m.content === '!ping') await m.reply('Pong');
});

await client.login(process.env.FLUXER_BOT_TOKEN);
