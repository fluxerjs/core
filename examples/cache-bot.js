/**
 * Cache-aware Fluxer bot — custom limits, stats, and periodic sweeps.
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/cache-bot.js
 *
 * See: https://fluxer.js.org/guides/caching/
 */

import { Client, Events } from '@fluxerjs/core';

const client = new Client({
  cache: {
    guilds: 100,
    channels: 2_000,
    users: 5_000,
    members: 2_000,
    messages: 25,
  },
});

client.on(Events.Ready, () => {
  console.log('Ready!', client.cache.stats());
});

// Hold references across reconnects — READY / GUILD_CREATE patch in place.
/** @type {import('@fluxerjs/core').Guild | null} */
let primaryGuild = null;

client.on(Events.GuildCreate, (guild) => {
  if (!primaryGuild) {
    primaryGuild = guild;
    console.log('Tracking guild', guild.id, guild.name);
  }
});

client.on(Events.GuildAvailable, (guild) => {
  if (primaryGuild && guild === primaryGuild) {
    console.log('Same guild instance recovered after outage:', guild.name);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!cache') {
    const stats = client.cache.stats();
    await message.reply(
      [
        `guilds=${stats.guilds}`,
        `channels=${stats.channels}`,
        `users=${stats.users}`,
        `members=${stats.members}`,
        `messages=${stats.messages}`,
        `limits.messages=${String(client.cache.limits.messages)}`,
      ].join(' · '),
    );
    return;
  }

  if (message.content === '!sweep') {
    const messages = client.cache.sweepMessages();
    const members = client.cache.sweepMembers((member) => member.id !== client.user?.id);
    await message.reply(`Swept ${messages} messages, ${members} members`);
  }
});

// Periodic maintenance for long-running bots
const HOUR = 60 * 60 * 1000;
setInterval(() => {
  const removed = client.cache.sweepMessages((msg) => Date.now() - msg.createdAt.getTime() > HOUR);
  if (removed > 0) console.log(`Swept ${removed} old messages`);
}, HOUR).unref?.();

await client.login(process.env.FLUXER_BOT_TOKEN);
