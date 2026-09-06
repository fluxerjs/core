/**
 * Minimal Fluxer bot — login + !ping → Pong.
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/minimal-bot.js
 *
 * See: https://fluxer.js.org/guides/basic-bot/
 */

import { Client, Events } from '@fluxerjs/core';

const client = new Client();

client.on(Events.Ready, () => console.log('Ready!'));

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    await message.reply('Pong');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);
