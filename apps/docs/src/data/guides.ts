/**
 * Guide content for the docs site.
 * Each guide is a separate page.
 */

export interface GuideSection {
  title?: string;
  description?: string;
  code?: string;
  language?: 'javascript' | 'bash';
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'getting-started' | 'webhooks' | 'voice' | 'sending-messages' | 'events' | 'other';
  sections: GuideSection[];
}

export const guides: Guide[] = [
  {
    id: 'installation',
    slug: 'installation',
    title: 'Installation',
    description: 'Install the package and configure your bot token.',
    category: 'getting-started',
    sections: [
      {
        code: `npm install @fluxerjs/core

# Run your bot (Node 18+)
FLUXER_BOT_TOKEN=your_token node your-bot.js`,
        language: 'bash',
      },
    ],
  },
  {
    id: 'basic-bot',
    slug: 'basic-bot',
    title: 'Basic Bot',
    description: 'A minimal bot that responds to !ping with Pong.',
    category: 'getting-started',
    sections: [
      {
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.Ready, () => console.log('Ready!'));
client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!ping') {
    await message.reply('Pong!');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'sending-without-reply',
    slug: 'sending-without-reply',
    title: 'Sending Without Reply',
    description:
      'Send messages to the same channel or to specific channels. Covers message.send(), message.sendTo(), client.channels.send(), and client.channels.fetch().',
    category: 'sending-messages',
    sections: [
      {
        title: 'message.send() vs message.reply()',
        description:
          'message.reply() sends a message that references another message (shows as a "reply" in Discord). message.send() sends to the same channel with no reference—a regular standalone message.',
      },
      {
        title: 'Sending to the same channel',
        description:
          'Use message.send() when you want to post in the channel without replying. Same signature as reply(): pass a string or object with content and/or embeds.',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!hello') {
    await message.send('Hello! This is a regular message, not a reply.');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Sending to a specific channel (e.g. logging)',
        description:
          'Use message.sendTo(channelId, payload) to send to another channel—handy for logging, announcements, or forwarding. You only need the target channel ID.',
        code: `import { Client, Events, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID; // Your log channel's snowflake

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!report' && message.guildId && LOG_CHANNEL_ID) {
    const embed = new EmbedBuilder()
      .setTitle('User report')
      .setDescription(message.content)
      .addFields(
        { name: 'Author', value: message.author.username, inline: true },
        { name: 'Channel', value: \`<#\${message.channelId}>\`, inline: true }
      )
      .setTimestamp();

    await message.sendTo(LOG_CHANNEL_ID, { embeds: [embed.toJSON()] });
    await message.send('Report logged.');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'client.channels.send() — send by channel ID',
        description:
          'Use client.channels.send(channelId, payload) when you have a channel ID. Works even if the channel is not cached. No need to fetch first when you only need to send.',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;

client.on(Events.Ready, async () => {
  if (ANNOUNCE_CHANNEL_ID) {
    await client.channels.send(ANNOUNCE_CHANNEL_ID, 'Bot is online!');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'client.channels.fetch() — get channel by ID',
        description:
          'Fetch a channel by ID from the API (or cache). Use channel.isSendable() before sending. For sending when you only have an ID, prefer client.channels.send() which skips the fetch.',
        code: `import { Client } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
await client.login(process.env.FLUXER_BOT_TOKEN);

// Fetch channel (from API if not cached)
const channel = await client.channels.fetch(channelId);
if (channel?.isSendable()) {
  await channel.send('Hello!');
}
// Or for webhooks: if (channel?.createWebhook) { ... }`,
        language: 'javascript',
      },
      {
        title: 'fetch message by id',
        description:
          'Use channel.messages.fetch(messageId) when you have the channel. For IDs-only, fetch the channel first.',
        code: `// When you have the channel
const message = await channel.messages.fetch(messageId);
if (message) {
  await message.edit({ content: 'Updated!' });
  await message.react('👍');
}

// When you only have IDs (e.g. from sqlite)
const ch = await client.channels.fetch(channelId);
const msg = await ch?.messages?.fetch(messageId);
if (msg) await msg.delete();

// When channel is cached
const m = client.channels.get(channelId);
if (m?.isSendable()) {
  const mes = await m.messages.fetch(messageId);
  if (mes) await mes.edit({ content: 'Edited!' });
}

// Refresh a stale message instance
const updated = await message.fetch();
if (updated) console.log(updated.content);`,
        language: 'javascript',
      },
      {
        title: 'message.channel and message.guild',
        description:
          'Access the channel or guild from a message. Resolved from cache; null if not cached (e.g. DM channel).',
        code: `client.on(Events.MessageCreate, async (message) => {
  const channel = message.channel;   // TextChannel or DMChannel | null
  const guild = message.guild;       // Guild | null (null for DMs)
  if (message.channel?.isSendable()) {
    await message.channel.send('Same channel, different API');
  }
});`,
        language: 'javascript',
      },
      {
        title: 'Quick reference',
        code: `// Same channel, no reply
await message.send('Pong!');

// Reply to the message
await message.reply('Pong!');

// Send to a specific channel
await message.sendTo(logChannelId, 'User joined!');
await client.channels.send(channelId, 'New update available!');`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'embeds',
    slug: 'embeds',
    title: 'Embeds',
    description: 'Send rich embeds with EmbedBuilder.',
    category: 'sending-messages',
    sections: [
      {
        code: `import { Client, Events, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!embed') {
    const embed = new EmbedBuilder()
      .setTitle('Hello!')
      .setDescription('This is a Fluxer embed.')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Field 1', value: 'Value 1', inline: true },
        { name: 'Field 2', value: 'Value 2', inline: true }
      )
      .setFooter({ text: 'Powered by Fluxer.js' })
      .setTimestamp();

    await message.reply({ embeds: [embed.toJSON()] });
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'editing-embeds',
    slug: 'editing-embeds',
    title: 'Editing Embeds',
    description: 'Edit existing message embeds with message.edit().',
    category: 'sending-messages',
    sections: [
      {
        title: 'Overview',
        description:
          'The Fluxer API supports editing existing messages via PATCH. You can update the message content, embeds, or both. Only the message author (or admins with proper permissions) can edit messages.',
      },
      {
        title: 'Edit Content',
        description: 'Update the text content of a message you sent.',
        code: `const reply = await message.reply('Initial message');
await reply.edit({ content: 'Updated message!' });`,
        language: 'javascript',
      },
      {
        title: 'Edit Embeds',
        description:
          'Replace or update embeds on an existing message. Pass an array of EmbedBuilder instances or APIEmbed objects.',
        code: `import { Client, Events, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!editembed') {
    const embed = new EmbedBuilder()
      .setTitle('Loading...')
      .setColor(0x5865f2)
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed.toJSON()] });

    // Simulate loading, then update the embed
    await new Promise((r) => setTimeout(r, 2000));

    const updatedEmbed = new EmbedBuilder()
      .setTitle('Done!')
      .setDescription('This embed was edited after 2 seconds.')
      .setColor(0x57f287)
      .setTimestamp();

    await reply.edit({ embeds: [updatedEmbed] });
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Edit Content and Embeds Together',
        description: 'You can update both content and embeds in a single edit call.',
        code: `await message.edit({
  content: 'Updated text',
  embeds: [new EmbedBuilder().setTitle('Updated embed').setColor(0x5865f2).toJSON()],
});`,
        language: 'javascript',
      },
      {
        title: 'API Reference',
        description:
          'The edit endpoint is PATCH /channels/{channel_id}/messages/{message_id}. See openapi.json for the full request body schema. The SDK Message.edit() accepts { content?: string; embeds?: (APIEmbed | EmbedBuilder)[] }.',
      },
    ],
  },
  {
    id: 'reactions',
    slug: 'reactions',
    title: 'Reactions',
    description:
      'Add, remove, and listen for message reactions with Message.react(), removeReaction(), and reaction events.',
    category: 'sending-messages',
    sections: [
      {
        title: 'Add a Reaction',
        description:
          'Use message.react() to add an emoji reaction as the bot. Pass a unicode emoji string or custom emoji { name, id }.',
        code: `const reply = await message.reply('React to this!');
await reply.react('👍');
await reply.react({ name: 'customemoji', id: '123456789012345678' });`,
        language: 'javascript',
      },
      {
        title: 'Remove Reactions',
        description:
          "Remove the bot's reaction with removeReaction(emoji). Remove a specific user's reaction with removeReaction(emoji, userId). Clear all reactions with removeAllReactions() or removeReactionEmoji(emoji).",
        code: `// Remove the bot's reaction
await message.removeReaction('👍');

// Remove a specific user's reaction (requires moderator permissions)
await message.removeReaction('👍', userId);

// Remove all reactions of one emoji from the message
await message.removeReactionEmoji('👍');

// Remove all reactions from the message
await message.removeAllReactions();`,
        language: 'javascript',
      },
      {
        title: 'Listen for Reactions',
        description:
          'MessageReactionAdd and MessageReactionRemove emit (reaction, user). Use reaction.emoji, reaction.messageId, reaction.channelId, reaction.guildId, or reaction.fetchMessage() to get the full message.',
        code: `client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (reaction.emoji.name === '👍') {
    console.log(\`User \${user.id} voted yes on message \${reaction.messageId}\`);
    const message = await reaction.fetchMessage();
    if (message) await message.react('✅');
  }
});

client.on(Events.MessageReactionRemove, (reaction, user) => {
  console.log(\`User \${user.id} removed \${reaction.emoji.name} from message \${reaction.messageId}\`);
});`,
        language: 'javascript',
      },
      {
        title: 'Reaction Roles Example',
        description:
          'See examples/reaction-roles-bot.js for a full bot that assigns roles when users react to a message. Uses (reaction, user), Guild.fetchMember(), and GuildMember.addRole()/removeRole().',
        code: `// Simplified reaction-roles logic
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (!reaction.guildId || reaction.messageId !== rolesMessageId) return;
  const roleId = ROLE_EMOJI_MAP[reaction.emoji.name];
  if (!roleId) return;
  const guild = client.guilds.get(reaction.guildId);
  const member = await guild?.fetchMember(user.id);
  if (member && !member.roles.includes(roleId)) await member.addRole(roleId);
});`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'webhooks',
    slug: 'webhooks',
    title: 'Webhooks',
    description:
      'A complete guide to Discord webhooks—sending messages without a gateway, creating webhooks, and managing them.',
    category: 'webhooks',
    sections: [
      {
        title: 'What are Webhooks?',
        description:
          'Webhooks let you send messages to a channel using a URL (ID + token). You can use them in scripts, CI pipelines, or anywhere you need to post without a full bot connection. No gateway, no events—just REST.',
      },
      {
        title: 'Webhooks Without a Bot',
        description:
          'A Client with intents: 0 is enough. No need to connect to the gateway or handle events. Ideal for scripts or one-off sends.',
        code: `import { Client, Webhook } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
const webhook = Webhook.fromToken(client, webhookId, webhookToken);
await webhook.send('Message from a script!');`,
        language: 'javascript',
      },
      {
        title: 'Creating a Webhook',
        description:
          'Create a webhook on a text channel. Requires Manage Webhooks permission. The token is returned only when creating—store it securely. It will never be returned when listing or fetching.',
        code: `import { Client } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
await client.login(process.env.FLUXER_BOT_TOKEN);

const channel = client.channels.get(channelId);
if (!channel?.createWebhook) throw new Error('Channel does not support webhooks');

const webhook = await channel.createWebhook({ name: 'My Webhook' });
console.log(webhook.id, webhook.token); // Store token—it won't be returned when listing`,
        language: 'javascript',
      },
      {
        title: 'Sending Messages',
        description:
          'Send text, embeds, or both. You can override the username and avatar for each message.',
        code: `import { Client, Webhook, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
const webhook = Webhook.fromToken(client, webhookId, webhookToken);

await webhook.send({
  content: 'Hello from webhook!',
  embeds: [
    new EmbedBuilder()
      .setTitle('Webhook Message')
      .setColor(0x5865f2)
      .setTimestamp()
      .toJSON(),
  ],
  username: 'Custom Name',
  avatar_url: 'https://example.com/avatar.png',
});`,
        language: 'javascript',
      },
      {
        title: 'Simple text only',
        code: `await webhook.send('Plain text message');`,
        language: 'javascript',
      },
      {
        title: 'Fetching & Listing Webhooks',
        description:
          'Fetch by ID or list channel/guild webhooks. Requires a logged-in bot. Fetched webhooks have no token and cannot send—only manage (delete).',
        code: `import { Client, Webhook } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
await client.login(process.env.FLUXER_BOT_TOKEN);

// Fetch single webhook (no token)
const webhook = await Webhook.fetch(client, webhookId);

// List channel webhooks
const channel = client.channels.get(channelId);
const channelWebhooks = await channel?.fetchWebhooks() ?? [];

// List guild webhooks
const guild = client.guilds.get(guildId);
const guildWebhooks = await guild?.fetchWebhooks() ?? [];`,
        language: 'javascript',
      },
      {
        title: 'Deleting a Webhook',
        code: `const webhook = await Webhook.fetch(client, webhookId);
await webhook.delete();`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'voice',
    slug: 'voice',
    title: 'Voice',
    description:
      'Join voice channels and play audio with @fluxerjs/voice. Supports WebM/Opus streams—no FFmpeg required.',
    category: 'voice',
    sections: [
      {
        title: 'Installation',
        description: 'Add the voice package alongside the core library.',
        code: `pnpm add @fluxerjs/voice @fluxerjs/core`,
        language: 'bash',
      },
      {
        title: 'Setup',
        description:
          'Create a VoiceManager before login so it receives VoiceStatesSync from READY/GUILD_CREATE. This lets the manager see users already in voice when the bot starts.',
        code: `import { Client, Events, VoiceChannel } from '@fluxerjs/core';
import { getVoiceManager } from '@fluxerjs/voice';

const client = new Client({ intents: 0 });
getVoiceManager(client); // Must be before login

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Join a Voice Channel',
        description:
          "Get the user's voice channel with getVoiceChannelId, then join. The connection resolves when ready.",
        code: `const voiceManager = getVoiceManager(client);
const voiceChannelId = voiceManager.getVoiceChannelId(guildId, userId);
if (!voiceChannelId) return; // User not in voice

const channel = client.channels.get(voiceChannelId);
if (!(channel instanceof VoiceChannel)) return;

const connection = await voiceManager.join(channel);`,
        language: 'javascript',
      },
      {
        title: 'Play Audio',
        description:
          'Play a WebM/Opus URL or stream. The voice package does not use FFmpeg—input must be WebM with Opus. Use yt-dlp or similar to get direct stream URLs from YouTube.',
        code: `// URL (fetched and demuxed automatically)
await connection.play('https://example.com/audio.webm');

// Or a Node.js ReadableStream of Opus
await connection.play(opusStream);`,
        language: 'javascript',
      },
      {
        title: 'Getting Stream URLs from YouTube',
        description: 'Use youtube-dl-exec or yt-dlp to extract a WebM/Opus URL.',
        code: `import youtubedl from 'youtube-dl-exec';

const result = await youtubedl(videoUrl, {
  getUrl: true,
  f: 'bestaudio[ext=webm][acodec=opus]/bestaudio[ext=webm]/bestaudio',
}, { timeout: 15000 });

const streamUrl = String(result ?? '').trim();
await connection.play(streamUrl);`,
        language: 'javascript',
      },
      {
        title: 'Stop and Leave',
        description: "Stop playback and disconnect from the guild's voice channel.",
        code: `const connection = voiceManager.getConnection(guildId);
connection?.stop();
if (connection) voiceManager.leave(guildId);`,
        language: 'javascript',
      },
      {
        title: 'LiveKit and serverLeave',
        description:
          'If using LiveKit, the server may emit serverLeave. Listen and reconnect if needed.',
        code: `connection.on?.('serverLeave', async () => {
  try {
    const conn = await voiceManager.join(channel);
    await conn.play(streamUrl);
  } catch (e) {
    console.error('Auto-reconnect failed:', e);
  }
});`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'events',
    slug: 'events',
    title: 'Events',
    description:
      'Listen to gateway events with client.on. Handle messages, guild updates, voice state changes, and more.',
    category: 'events',
    sections: [
      {
        title: 'Basic Usage',
        description:
          'Use client.on(Events.X, handler) to subscribe to events. Handlers receive event-specific payloads.',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.Ready, () => {
  console.log('Bot is ready!');
});

client.on(Events.MessageCreate, async (message) => {
  console.log(message.content);
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Common Events',
        description: 'Essential events for most bots.',
        code: `// Bot finished loading
client.on(Events.Ready, () => {});

// New message (DM or guild)
client.on(Events.MessageCreate, async (message) => {});

// Reaction events
client.on(Events.MessageReactionAdd, (data) => {});
client.on(Events.MessageReactionRemove, (data) => {});

// Guild joined/left/updated
client.on(Events.GuildCreate, (guild) => {});
client.on(Events.GuildDelete, (guild) => {});

// Channel created/updated/deleted
client.on(Events.ChannelCreate, (channel) => {});
client.on(Events.ChannelDelete, (channel) => {});

// Member joined/left/updated
client.on(Events.GuildMemberAdd, (member) => {});
client.on(Events.GuildMemberRemove, (member) => {});

// Voice state changed (for @fluxerjs/voice)
client.on(Events.VoiceStateUpdate, (data) => {});
client.on(Events.VoiceServerUpdate, (data) => {});`,
        language: 'javascript',
      },
      {
        title: 'Reaction Events',
        description:
          'Listen for when users add or remove reactions. The payload includes message_id, channel_id, user_id, and emoji (name and optional id for custom emojis). Use MessageReactionRemoveAll and MessageReactionRemoveEmoji for moderator actions.',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageReactionAdd, (data) => {
  const { message_id, channel_id, user_id, emoji } = data;
  const emojiStr = emoji.id ? \`<:\${emoji.name}:\${emoji.id}>\` : emoji.name;
  console.log(\`User \${user_id} reacted with \${emojiStr} on message \${message_id}\`);

  // Filter for specific message (e.g. poll) or emoji
  if (data.emoji.name === '👍') {
    console.log('Someone voted yes!');
  }
});

client.on(Events.MessageReactionRemove, (data) => {
  const { message_id, user_id, emoji } = data;
  console.log(\`User \${user_id} removed \${emoji.name} from message \${message_id}\`);
});

client.on(Events.MessageReactionRemoveAll, (data) => {
  console.log(\`All reactions cleared from message \${data.message_id}\`);
});

client.on(Events.MessageReactionRemoveEmoji, (data) => {
  console.log(\`All \${data.emoji.name} reactions removed from message \${data.message_id}\`);
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Error Handling',
        code: `client.on(Events.Error, (err) => {
  console.error('Client error:', err);
});`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'prefix-commands',
    slug: 'prefix-commands',
    title: 'Prefix Commands',
    description: 'Handle !commands by listening to MessageCreate and parsing the content.',
    category: 'events',
    sections: [
      {
        title: 'Basic Structure',
        description: 'Check for a prefix, split args, and dispatch to command handlers.',
        code: `import { Client, Events } from '@fluxerjs/core';

const PREFIX = '!';
const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'ping') {
    await message.reply('Pong!');
  }
  if (command === 'hello') {
    const name = args[0] ?? 'there';
    await message.reply(\`Hello, \${name}!\`);
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Guild-Only Commands',
        code: `if (!message.guildId) {
  await message.reply('This command only works in a server.');
  return;
}`,
        language: 'javascript',
      },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  webhooks: 'Webhooks',
  voice: 'Voice',
  'sending-messages': 'Sending Messages',
  events: 'Events',
  other: 'Other',
};

export function getCategoryLabel(cat?: string): string {
  return (cat && CATEGORY_LABELS[cat]) ?? 'Guides';
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
