/**
 * Prefix-command bot — latency, embeds, DMs, replies, and reactions.
 *
 * Commands: !ping, !info, !help, !dm, !dmuser, !replytest, !replynoping, !react, !editembed, !attachurl
 *
 * Usage (from repo root after pnpm install && pnpm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/ping-bot.js
 *
 * For voice see voice-bot.js; for profiles / server info see info-bot.js.
 */

import {
  Client,
  EmbedBuilder,
  Events,
  parsePrefixCommand,
  parseUserMention,
  Routes,
  User,
} from '@fluxerjs/core';

const PREFIX = '!';
const BRAND_COLOR = 0x4641d9;

function formatUptime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/** @type {Map<string, { description: string, execute: Function }>} */
const commands = new Map();

commands.set('ping', {
  description: 'Check gateway latency',
  async execute(message, client) {
    const gatewayLatency = client.ws.ping;
    const embed = new EmbedBuilder()
      .setTitle('Pong!')
      .setColor(BRAND_COLOR)
      .addFields({
        name: 'Gateway Latency',
        value: gatewayLatency === null ? '`Measuring…`' : `\`${gatewayLatency}ms\``,
        inline: true,
      })
      .setFooter({ text: 'Fluxer Bot' })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
});

commands.set('info', {
  description: 'Display bot information',
  async execute(message, client) {
    const uptime = client.uptime;
    const gatewayLatency = client.ws.ping;
    const embed = new EmbedBuilder()
      .setTitle('Bot Information')
      .setColor(BRAND_COLOR)
      .setThumbnail(client.user?.avatarURL?.() ?? null)
      .addFields(
        { name: 'Username', value: client.user?.username ?? 'Unknown', inline: true },
        { name: 'Guilds', value: `${client.guilds.size}`, inline: true },
        { name: 'Channels', value: `${client.channels.size}`, inline: true },
        {
          name: 'Uptime',
          value: uptime === null ? 'Unavailable' : formatUptime(uptime),
          inline: true,
        },
        {
          name: 'Gateway Latency',
          value: gatewayLatency === null ? 'Measuring…' : `${gatewayLatency}ms`,
          inline: true,
        },
        { name: 'Node.js', value: process.version, inline: true },
      )
      .setFooter({ text: 'Powered by @fluxerjs/core' })
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
});

commands.set('dm', {
  description: 'DM yourself (demo of user.send)',
  async execute(message) {
    try {
      await message.author.send('You requested a DM from the bot.');
      await message.reply('Check your DMs!');
    } catch {
      await message.reply('Could not DM you. You may have DMs disabled.').catch(() => {});
    }
  },
});

commands.set('dmuser', {
  description: 'DM a user: !dmuser @user [message]',
  async execute(message, client, args) {
    const userId = parseUserMention(args[0] ?? '');
    if (!userId) {
      await message.reply('Provide a user mention or ID. Example: `!dmuser @Someone Hello!`');
      return;
    }
    const text = args.slice(1).join(' ') || 'Hello from the bot!';
    try {
      const userData = await client.rest.get(Routes.user(userId));
      const user = new User(client, userData);
      await user.send(text);
      await message.reply(`Sent DM to **${user.globalName ?? user.username}**.`);
    } catch {
      await message
        .reply('Could not send DM. The user may not exist or may have DMs disabled.')
        .catch(() => {});
    }
  },
});

commands.set('replytest', {
  description: 'Reply to your message (threaded reply)',
  async execute(message) {
    await message.reply('This message is a reply to yours.');
  },
});

commands.set('replynoping', {
  description: 'Reply without pinging you',
  async execute(message) {
    await message.reply('Replied silently — no @mention ping!', { ping: false });
  },
});

commands.set('react', {
  description: 'Reply and add reactions',
  async execute(message) {
    const reply = await message.reply('React below!');
    await reply.react('👍');
    await reply.react('❤️');
    await reply.react('🎉');
  },
});

commands.set('editembed', {
  description: 'Edit an embed after sending',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('Original Embed')
      .setDescription('This embed will be edited in 2 seconds...')
      .setColor(BRAND_COLOR)
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed] });
    await new Promise((r) => setTimeout(r, 2000));

    const updated = new EmbedBuilder()
      .setTitle('Edited Embed')
      .setDescription('Use `message.edit({ embeds: [...] })` — pass EmbedBuilder directly.')
      .setColor(0x57f287)
      .addFields(
        { name: 'Original', value: 'First state', inline: true },
        { name: 'Edited', value: 'Updated state', inline: true },
      )
      .setTimestamp();

    await reply.edit({ embeds: [updated] });
  },
});

commands.set('attachurl', {
  description: 'Attach a file by URL',
  async execute(message) {
    await message.reply({
      content: 'File attached from URL:',
      files: [{ name: 'trulli.jpg', url: 'https://www.w3schools.com/html/pic_trulli.jpg' }],
    });
  },
});

commands.set('help', {
  description: 'List available commands',
  async execute(message) {
    const fields = [...commands.entries()].map(([name, cmd]) => ({
      name: `${PREFIX}${name}`,
      value: cmd.description,
      inline: true,
    }));
    const embed = new EmbedBuilder()
      .setTitle('Commands')
      .setDescription(
        `Use \`${PREFIX}<command>\`. Also try \`examples/voice-bot.js\` (voice being reworked) and \`info-bot.js\`.`,
      )
      .setColor(BRAND_COLOR)
      .addFields(...fields)
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  },
});

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client({
  rest: process.env.FLUXER_API_URL ? { api: process.env.FLUXER_API_URL } : undefined,
});

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
  console.log(`Serving ${client.guilds.size} guild(s)`);
  client.user?.setPresence({
    status: 'online',
    customStatus: { text: 'Try !help' },
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (!parsed) return;

  const command = commands.get(parsed.command);
  if (!command) return;

  try {
    await command.execute(message, client, parsed.args);
  } catch (err) {
    console.error(`Error executing ${parsed.command}:`, err);
    await message.reply('An error occurred while running that command.').catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

try {
  await client.login(token);
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
