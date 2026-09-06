/**
 * Webhook example — create, list, send, and delete webhooks.
 *
 * Commands:
 *   !webhook create [name]
 *   !webhook list [channel|guild]
 *   !webhook send <id> <token> [message]
 *   !webhook delete <id>
 *
 * Usage:
 *   FLUXER_BOT_TOKEN=your_token node examples/webhook-bot.js
 *
 * @see https://fluxer.js.org/guides/webhooks/
 */

import { Client, EmbedBuilder, Events, parsePrefixCommand, Webhook } from '@fluxerjs/core';

const PREFIX = '!';
const BRAND_COLOR = 0x4641d9;

async function handleWebhookCreate(message, client, args) {
  const name = args[0] ?? 'My Webhook';

  if (!message.guildId) {
    await message.reply('Use this command in a server.');
    return;
  }

  const channel = client.channels.get(message.channelId);
  if (!channel?.isGuild()) {
    await message.reply('This channel does not support webhooks.');
    return;
  }

  try {
    const webhook = await channel.createWebhook({ name });
    const embed = new EmbedBuilder()
      .setTitle('Webhook Created')
      .setColor(BRAND_COLOR)
      .addFields(
        { name: 'Name', value: webhook.name, inline: true },
        { name: 'ID', value: `\`${webhook.id}\``, inline: true },
        { name: 'Channel ID', value: `\`${webhook.channelId}\``, inline: true },
        {
          name: 'Send',
          value:
            'Use `!webhook send <id> <token> [message]`. **Store the token** — listing webhooks does not return it.',
        },
      )
      .setTimestamp();
    await message.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Webhook create error:', err);
    await message.reply(`Failed to create webhook: ${err.message ?? err}`).catch(() => {});
  }
}

async function handleWebhookList(message, client, args) {
  const scope = args[0]?.toLowerCase();

  if (!message.guildId) {
    await message.reply('Use this command in a server.');
    return;
  }

  try {
    const channel = client.channels.get(message.channelId);
    const webhooks =
      scope === 'guild'
        ? await client.guilds.get(message.guildId)?.fetchWebhooks()
        : channel?.isGuild()
          ? await channel.fetchWebhooks()
          : undefined;

    if (!webhooks?.length) {
      await message.reply(
        `No webhooks in this ${scope === 'guild' ? 'guild' : 'channel'}. Use \`!webhook create\` first.`,
      );
      return;
    }

    const fields = webhooks.slice(0, 10).map((w) => ({
      name: w.name ?? 'Unnamed',
      value: `ID: \`${w.id}\`\nChannel: \`${w.channelId}\``,
      inline: true,
    }));

    const embed = new EmbedBuilder()
      .setTitle(`${scope === 'guild' ? 'Guild' : 'Channel'} Webhooks`)
      .setColor(BRAND_COLOR)
      .addFields(...fields)
      .setFooter({
        text: `Showing ${Math.min(webhooks.length, 10)} of ${webhooks.length} webhooks`,
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Webhook list error:', err);
    await message.reply(`Failed to fetch webhooks: ${err.message ?? err}`).catch(() => {});
  }
}

async function handleWebhookSend(message, client, args) {
  const webhookId = args[0];
  const webhookToken = args[1];
  const content = args.slice(2).join(' ');

  if (!webhookId || !webhookToken) {
    await message.reply(
      'Usage: `!webhook send <webhook_id> <webhook_token> [message]`\nThe token is only returned when creating a webhook.',
    );
    return;
  }

  try {
    const webhook = Webhook.fromToken(client, webhookId, webhookToken);
    await webhook.send(
      content
        ? { content }
        : {
            content: 'Hello from the Fluxer webhook bot!',
            embeds: [
              new EmbedBuilder()
                .setTitle('Webhook Message')
                .setDescription('Sent via webhook.send() — EmbedBuilder, no .toJSON().')
                .setColor(BRAND_COLOR)
                .setTimestamp(),
            ],
          },
    );
    await message.reply('Message sent via webhook.');
  } catch (err) {
    console.error('Webhook send error:', err);
    await message.reply(`Failed to send: ${err.message ?? err}`).catch(() => {});
  }
}

async function handleWebhookDelete(message, client, args) {
  const webhookId = args[0];

  if (!webhookId) {
    await message.reply('Usage: `!webhook delete <webhook_id>`');
    return;
  }

  if (!message.guildId) {
    await message.reply('Use this command in a server.');
    return;
  }

  try {
    const webhook = await Webhook.fetch(client, webhookId);
    await webhook.delete();
    await message.reply('Webhook deleted.');
  } catch (err) {
    console.error('Webhook delete error:', err);
    await message.reply(`Failed to delete: ${err.message ?? err}`).catch(() => {});
  }
}

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client();

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
  console.log('Webhook commands: !webhook create | list | send | delete');
  client.user?.setPresence({
    status: 'online',
    customStatus: { text: 'Managing webhooks' },
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (parsed?.command !== 'webhook') return;

  const [subcmd, ...args] = parsed.args;

  try {
    switch (subcmd) {
      case 'create':
        await handleWebhookCreate(message, client, args);
        break;
      case 'list':
        await handleWebhookList(message, client, args);
        break;
      case 'send':
        await handleWebhookSend(message, client, args);
        break;
      case 'delete':
        await handleWebhookDelete(message, client, args);
        break;
      default:
        await message.reply(
          '**Webhook commands:**\n' +
            '`!webhook create [name]` – Create a webhook\n' +
            '`!webhook list [channel|guild]` – List webhooks\n' +
            '`!webhook send <id> <token> [message]` – Send via webhook\n' +
            '`!webhook delete <id>` – Delete a webhook',
        );
    }
  } catch (err) {
    console.error('Command error:', err);
    await message.reply('An error occurred.').catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

try {
  await client.login(token);
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
