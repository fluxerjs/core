/**
 * Message history example: preload, fetch, search, bulk delete.
 *
 * Commands:
 *   !latest             preload the current channel (bot-legal bulk warm)
 *   !history [n]        fetch the last n messages (default 10, max 50)
 *   !search <query>     search in this guild (scope: current)
 *   !purge <n>          bulk-delete the last n messages (1-100)
 *
 * Usage (from repo root after pnpm install && pnpm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/history-bot.js
 *
 * See: https://fluxer.js.org/guides/message-history/
 */

import { Client, ErrorCodes, Events, FluxerError, parsePrefixCommand } from '@fluxerjs/core';

const PREFIX = '!';
const client = new Client();

client.on(Events.Ready, () => {
  console.log(
    `Logged in as ${client.user?.username}. Commands: !latest, !history, !search, !purge`,
  );
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (!parsed) return;

  const { command, args } = parsed;
  const channel = message.channel ?? (await message.resolveChannel().catch(() => null));
  if (!channel?.isTextBased()) {
    await message.reply('This channel cannot hold messages.');
    return;
  }

  try {
    if (command === 'latest') {
      const latest = await client.preloadMessages([channel.id]);
      const msg = latest[channel.id];
      await message.reply(msg ? `Latest cached id: ${msg.id}` : 'Channel is empty.');
      return;
    }

    if (command === 'history') {
      const limit = Math.min(50, Math.max(1, Number(args[0]) || 10));
      const page = await channel.messages.fetch({ limit });
      const lines = [...page.values()].map(
        (m) => `${m.author?.username ?? '?'}: ${m.content ?? ''}`,
      );
      await message.reply(
        lines.length ? lines.slice(0, 15).join('\n').slice(0, 1800) : 'No messages.',
      );
      return;
    }

    if (command === 'search') {
      const query = args.join(' ').trim();
      if (!query) {
        await message.reply('Usage: `!search <query>`');
        return;
      }
      const results = await client.searchMessages({
        content: query,
        contextGuildId: message.guildId ?? undefined,
        contextChannelId: channel.id,
        hitsPerPage: 8,
      });
      if ('indexing' in results) {
        await message.reply('Search is still indexing this channel.');
        return;
      }
      const hits = results.messages;
      const preview = hits
        .map((m) => `${m.author?.username ?? '?'}: ${m.content ?? ''}`)
        .join('\n');
      const header = `${results.total} hits (page ${results.page}, ${results.hitsPerPage} per page)`;
      await message.reply(preview ? `${header}\n${preview}`.slice(0, 1800) : 'No hits.');
      return;
    }

    if (command === 'purge') {
      const n = Number(args[0]);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        await message.reply('Usage: `!purge <1-100>`');
        return;
      }
      const deleted = await channel.bulkDelete(n);
      await message.reply(`Deleted ${deleted.length} message(s).`);
    }
  } catch (err) {
    const code = err instanceof FluxerError ? err.code : null;
    console.error('Command error:', code ?? err);
    if (code === ErrorCodes.InvalidChannelType) {
      await message.reply('That channel type cannot send or fetch messages.').catch(() => {});
      return;
    }
    await message
      .reply(err instanceof Error ? err.message : 'Something went wrong.')
      .catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

await client.login(process.env.FLUXER_BOT_TOKEN);
