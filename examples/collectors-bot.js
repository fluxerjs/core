/**
 * Collectors example: awaitMessages / awaitReactions.
 *
 * Commands:
 *   !ask   wait for your next message in this channel (15s)
 *   !vote  post a prompt and wait for thumbs up / down (30s)
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/collectors-bot.js
 *
 * Guide: https://fluxer.js.org/guides/collectors/
 */

import { Client, ErrorCodes, Events, FluxerError, parsePrefixCommand } from '@fluxerjs/core';

const PREFIX = '!';
const client = new Client();

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (!parsed) return;

  const channel = message.channel ?? (await message.resolveChannel().catch(() => null));
  if (!channel) {
    await message.reply('This channel cannot collect messages.');
    return;
  }

  try {
    if (parsed.command === 'ask') {
      await message.reply('What is your favorite color? (15s)');
      const collected = await channel.awaitMessages({
        filter: (m) => m.author.id === message.author.id,
        time: 15_000,
        max: 1,
        errors: ['time'],
      });
      const answer = collected.first();
      if (answer) await answer.reply(`Nice. You said: **${answer.content}**`);
      return;
    }

    if (parsed.command === 'vote') {
      const prompt = await message.reply('React with a thumbs up or down (30s)');
      await prompt.react('👍');
      await prompt.react('👎');

      const collected = await prompt.awaitReactions({
        filter: (reaction, user) =>
          !user.bot &&
          user.id === message.author.id &&
          (reaction.emoji.name === '👍' || reaction.emoji.name === '👎'),
        time: 30_000,
        max: 1,
        errors: ['time'],
      });
      const hit = collected.first();
      if (hit) await prompt.reply(`${message.author.username} voted ${hit.emoji.name}`);
    }
  } catch (err) {
    if (err instanceof FluxerError && err.code === ErrorCodes.CollectorIdle) {
      await message.reply('Timed out.').catch(() => {});
      return;
    }
    console.error(err);
    await message.reply('Collector failed.').catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error(err));

await client.login(process.env.FLUXER_BOT_TOKEN);
