/**
 * Guide content for the docs site.
 * Each guide is a separate page.
 */

export interface GuideTable {
  headers: string[];
  rows: string[][];
  /** Column indices to render as inline code (e.g. [1] for payload column) */
  codeColumns?: number[];
}

export interface GuideSection {
  title?: string;
  description?: string;
  code?: string;
  language?: 'javascript' | 'bash' | 'text';
  table?: GuideTable;
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  description: string;
  category:
    | 'getting-started'
    | 'webhooks'
    | 'voice'
    | 'sending-messages'
    | 'media'
    | 'events'
    | 'other';
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
    description:
      'Complete reference for EmbedBuilder: title, description, author, footer, fields, color, media, and more.',
    category: 'sending-messages',
    sections: [
      {
        title: 'Overview',
        description:
          'Use EmbedBuilder to create rich embeds. Call toJSON() when passing to reply(), send(), or edit(). An embed must have at least one of: title, description, fields, or image/thumbnail. A description-only embed (no title) is valid.',
      },
      {
        title: 'Basic embed',
        description: 'Minimal embed with title, description, color, fields, footer, and timestamp.',
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
      {
        title: 'Title, Description, and URL',
        description:
          'setTitle() and setDescription() accept strings (max 256 and 4096 chars). setURL() makes the title a clickable link.',
        code: `const embed = new EmbedBuilder()
  .setTitle('Clickable Title')
  .setDescription('Main body text here.')
  .setURL('https://example.com');`,
        language: 'javascript',
      },
      {
        title: 'Color',
        description:
          'setColor() accepts: number (0x5865f2), hex string ("#5865f2"), or [r, g, b] array.',
        code: `embed.setColor(0x5865f2);
embed.setColor('#57f287');
embed.setColor([88, 101, 242]);`,
        language: 'javascript',
      },
      {
        title: 'Author',
        description: 'setAuthor() adds a header line with name. Optional: iconURL, url.',
        code: `embed.setAuthor({
  name: 'Fluxer.js',
  iconURL: 'https://example.com/icon.png',
  url: 'https://fluxerjs.dev',
});`,
        language: 'javascript',
      },
      {
        title: 'Footer',
        description: 'setFooter() adds text at the bottom. Optional: iconURL.',
        code: `embed.setFooter({
  text: 'Powered by Fluxer.js',
  iconURL: 'https://example.com/footer-icon.png',
});`,
        language: 'javascript',
      },
      {
        title: 'Timestamp',
        description:
          'setTimestamp() shows a date. Omit or pass null for current time. Pass Date or number (ms) for a specific time.',
        code: `embed.setTimestamp();                    // current time
embed.setTimestamp(new Date('2026-01-01'));
embed.setTimestamp(Date.now() - 3600000);  // 1 hour ago`,
        language: 'javascript',
      },
      {
        title: 'Fields',
        description:
          'addFields() adds name/value pairs. Max 25 fields. Use inline: true for side-by-side layout. spliceFields() to insert/remove.',
        code: `embed.addFields(
  { name: 'Field 1', value: 'Value 1', inline: true },
  { name: 'Field 2', value: 'Value 2', inline: true },
  { name: 'Long field', value: 'Not inline, full width' }
);

// Insert/replace fields
embed.spliceFields(1, 1, { name: 'Replaced', value: 'New value' });`,
        language: 'javascript',
      },
      {
        title: 'Image and Thumbnail',
        description:
          'setImage() adds a large image. setThumbnail() adds a small image (e.g. top-right). Pass a URL string or EmbedMediaOptions (url, width, height, content_type, etc).',
        code: `embed.setImage('https://example.com/image.png');
embed.setThumbnail('https://example.com/thumb.png');

// With metadata
embed.setImage({
  url: 'https://example.com/image.png',
  width: 400,
  height: 200,
  content_type: 'image/png',
});`,
        language: 'javascript',
      },
      {
        title: 'Video and Audio',
        description:
          'setVideo() and setAudio() add video/audio to embeds (Fluxer supports these). Pass URL or EmbedMediaOptions. Include a title when using video. See Embed Media guide for full examples.',
        code: `embed.setVideo('https://example.com/video.mp4');
embed.setAudio({
  url: 'https://example.com/audio.mp3',
  duration: 120,
  content_type: 'audio/mpeg',
});`,
        language: 'javascript',
      },
      {
        title: 'Multiple embeds',
        description: 'Messages can include up to 10 embeds. Pass an array to embeds.',
        code: `await message.reply({
  embeds: [
    new EmbedBuilder().setTitle('First').setColor(0x5865f2).toJSON(),
    new EmbedBuilder().setTitle('Second').setColor(0x57f287).toJSON(),
  ],
});`,
        language: 'javascript',
      },
      {
        title: 'Load from existing embed',
        description:
          'EmbedBuilder.from() creates a builder from an API embed (e.g. from a received message). Edit and toJSON() to send.',
        code: `const existing = message.embeds[0];
if (existing) {
  const edited = EmbedBuilder.from(existing)
    .setTitle('Updated title')
    .setColor(0x57f287);
  await message.edit({ embeds: [edited.toJSON()] });
}`,
        language: 'javascript',
      },
      {
        title: 'Limits',
        description:
          'Title ≤256, description ≤4096, field name ≤256, field value ≤1024, footer ≤2048, author name ≤256. Max 25 fields. Combined title+description+fields+footer ≤6000 chars.',
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
    id: 'embed-media',
    slug: 'embed-media',
    title: 'Embed Media',
    description:
      'Add images, thumbnails, video, and audio to embeds with EmbedBuilder and EmbedMediaOptions.',
    category: 'media',
    sections: [
      {
        title: 'Images and Thumbnails',
        description:
          'Use setImage() and setThumbnail() with a URL string, or pass full EmbedMediaOptions for width, height, content_type, and other metadata.',
        code: `import { Client, Events, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!embedimg') {
    const embed = new EmbedBuilder()
      .setTitle('Image Embed')
      .setDescription('Simple image from URL.')
      .setImage('https://placehold.co/400x200/5865f2/white?text=Image')
      .setThumbnail('https://placehold.co/100x100/57f287/white?text=Thumb')
      .setColor(0x5865f2);

    await message.reply({ embeds: [embed.toJSON()] });
  }
});`,
        language: 'javascript',
      },
      {
        title: 'Image with Full Media Options',
        description:
          'Pass an object to setImage or setThumbnail with url, width, height, content_type, description, placeholder, duration, and flags. Use EmbedMediaFlags.IS_ANIMATED for animated GIFs.',
        code: `const embed = new EmbedBuilder()
  .setTitle('Image with metadata')
  .setDescription('EmbedMediaOptions: width, height')
  .setImage({
    url: 'https://placehold.co/400x200/5865f2/white?text=Image',
    width: 400,
    height: 200,
    content_type: 'image/png',
  })
  .setColor(0x5865f2);`,
        language: 'javascript',
      },
      {
        title: 'GIFs in embeds',
        description:
          'Embeds require GIF format for animated images (not MP4). Add EmbedMediaFlags.IS_ANIMATED to the flags field. For Tenor URLs, use resolveTenorToImageUrl() to get the GIF URL and flag — see the GIFs (Tenor) guide.',
      },
      {
        title: 'Video in Embeds',
        description:
          'Use setVideo() to add video to a rich embed. Fluxer supports the .video field. Include a title when using video. Pass a URL or EmbedMediaOptions (e.g. duration for progress bars).',
        code: `const embed = new EmbedBuilder()
  .setTitle('Video embed')
  .setDescription('Rich embed with video field.')
  .setVideo('https://example.com/sample.mp4')
  .setURL('https://example.com/sample.mp4')
  .setColor(0x5865f2);

// With full options (duration, dimensions for progress bar):
const embedWithDuration = new EmbedBuilder()
  .setTitle('Video with metadata')
  .setVideo({
    url: 'https://example.com/video.mp4',
    duration: 120,
    width: 1280,
    height: 720,
  })
  .setColor(0x5865f2);`,
        language: 'javascript',
      },
      {
        title: 'Audio in Embeds',
        description:
          'Use setAudio() to add audio to an embed. Pass a URL or EmbedMediaOptions (e.g. duration, content_type).',
        code: `const embed = new EmbedBuilder()
  .setTitle('Audio embed')
  .setDescription('Rich embed with audio field.')
  .setAudio({
    url: 'https://example.com/sample.mp3',
    duration: 180,
    content_type: 'audio/mpeg',
  })
  .setColor(0x5865f2);`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'gifs',
    slug: 'gifs',
    title: 'GIFs (Tenor)',
    description:
      'Send Tenor GIFs as content (gifv) or in embeds using resolveTenorToImageUrl() for GIF URLs.',
    category: 'media',
    sections: [
      {
        title: 'How Tenor GIFs Work',
        description:
          'Tenor embeds are created by the Fluxer unfurler when you send a Tenor URL as message content. Do not use custom embeds for Tenor GIFs—the API turns the URL into a type: "gifv" embed.',
      },
      {
        title: 'Send a Tenor GIF',
        description:
          'Send the Tenor URL as content. No embeds needed. The unfurler detects the URL and creates the gifv embed.',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!gif') {
    const tenorUrl = 'https://tenor.com/view/stressed-gif-7048057395502071840';
    await message.reply({ content: tenorUrl });
  }
});`,
        language: 'javascript',
      },
      {
        title: 'Tenor URL in an embed',
        description:
          'Tenor page URLs do not work as setImage() URLs. Use resolveTenorToImageUrl() to fetch the Tenor page or oEmbed, derive the GIF URL (embeds require GIF, not MP4), and return { url, flags: IS_ANIMATED }. For full gifv embeds, send the Tenor URL as content.',
        code: `import { EmbedBuilder, resolveTenorToImageUrl } from '@fluxerjs/core';

const tenorUrl = 'https://tenor.com/view/stressed-gif-7048057395502071840';
const media = await resolveTenorToImageUrl(tenorUrl);
if (media) {
  const embed = new EmbedBuilder()
    .setTitle('Tenor in embed')
    .setDescription('GIF URL + IS_ANIMATED flag')
    .setImage(media)
    .setColor(0x5865f2);
  await message.reply({ embeds: [embed.toJSON()] });
}`,
        language: 'javascript',
      },
      {
        title: 'Important',
        description:
          'Custom embeds cannot create gifv embeds. For full animated gifv, send the Tenor URL as content. resolveTenorToImageUrl() returns GIF URL + IS_ANIMATED (derived from media.tenor.com path).',
      },
    ],
  },
  {
    id: 'attachments',
    slug: 'attachments',
    title: 'File Attachments',
    description:
      'Upload files with messages and set attachment metadata (title, description, flags for spoiler, animated, explicit).',
    category: 'media',
    sections: [
      {
        title: 'Basic File Upload',
        description:
          'Pass files in your send options. Each file needs a name and data (Buffer, Blob, Uint8Array). Use with message.reply(), message.send(), or channel.send().',
        code: `import { Client, Events } from '@fluxerjs/core';
import { readFileSync } from 'fs';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!file') {
    const data = Buffer.from('Hello from Fluxer!', 'utf-8');
    await message.reply({
      content: 'Here is a file:',
      files: [{ name: 'hello.txt', data }],
    });
  }
});`,
        language: 'javascript',
      },
      {
        title: 'Attachment Metadata',
        description:
          'When using files, you can pass attachments to set metadata per file: filename, title, description, and flags. The id in each attachment matches the file index (0, 1, 2...).',
        code: `import { MessageAttachmentFlags } from '@fluxerjs/core';

await message.reply({
  content: 'Spoiler image:',
  files: [{ name: 'secret.png', data: imageBuffer }],
  attachments: [
    {
      id: 0,
      filename: 'secret.png',
      title: 'Hidden image',
      flags: MessageAttachmentFlags.IS_SPOILER,
    },
  ],
});`,
        language: 'javascript',
      },
      {
        title: 'Attachment Flags',
        description:
          'MessageAttachmentFlags: IS_SPOILER (8) blurs until clicked, CONTAINS_EXPLICIT_MEDIA (16) for explicit content, IS_ANIMATED (32) for GIFs and animated WebP. Combine with bitwise OR.',
        code: `import { MessageAttachmentFlags } from '@fluxerjs/core';

// Spoiler (blurred until clicked)
flags: MessageAttachmentFlags.IS_SPOILER

// Animated image (GIF, animated WebP)
flags: MessageAttachmentFlags.IS_ANIMATED

// Combine flags
flags: MessageAttachmentFlags.IS_SPOILER | MessageAttachmentFlags.IS_ANIMATED`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'attachments-by-url',
    slug: 'attachments-by-url',
    title: 'File Attachments by URL',
    description:
      'Attach files by passing a URL instead of buffer data. The SDK fetches the URL and uploads it as a normal attachment.',
    category: 'media',
    sections: [
      {
        title: 'Using a URL',
        description:
          'Pass { name, url } in the files array. The SDK fetches the URL (30s timeout), validates it with URL.canParse(), and uploads the result. Works with channel.send(), message.reply(), message.send(), webhook.send(), and client.channels.send().',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!attachurl') {
    await message.reply({
      content: 'Image from URL:',
      files: [
        {
          name: 'image.png',
          url: 'https://example.com/image.png',
        },
      ],
    });
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Mixing buffers and URLs',
        description:
          'You can combine file data and URLs in the same message. Order is preserved; attachments metadata id matches the file index.',
        code: `await message.reply({
  content: 'Two files:',
  files: [
    { name: 'local.txt', data: Buffer.from('Hello') },
    { name: 'remote.png', url: 'https://example.com/logo.png' },
  ],
});`,
        language: 'javascript',
      },
      {
        title: 'Optional filename override',
        description:
          'Use filename to control the displayed attachment name independently from the local name used during upload.',
        code: `files: [
  {
    name: 'fetched-image.png',
    url: 'https://example.com/image.jpg',
    filename: 'custom-display.png',
  },
]`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'profile-urls',
    slug: 'profile-urls',
    title: 'Profile URLs',
    description:
      'Get avatar, banner, and other CDN URLs easily with User/Webhook/GuildMember methods or standalone CDN helpers for raw API data.',
    category: 'media',
    sections: [
      {
        title: 'User avatar and banner',
        description:
          'When you have a User object (e.g. message.author), use avatarURL(), displayAvatarURL(), and bannerURL(). These handle animated avatars (a_ prefix) and default fallbacks.',
        code: `import { Client, Events, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!avatar') {
    const user = message.author;
    // avatarURL() returns null if no custom avatar; displayAvatarURL() uses default
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    const bannerUrl = user.bannerURL({ size: 512 });

    const embed = new EmbedBuilder()
      .setTitle(\`\${user.username}'s profile\`)
      .setThumbnail(avatarUrl)
      .setColor(user.avatarColor ?? 0x5865f2);
    if (bannerUrl) embed.setImage(bannerUrl);
    await message.reply({ embeds: [embed.toJSON()] });
  }
});`,
        language: 'javascript',
      },
      {
        title: 'Raw API data: CDN helpers',
        description:
          'When you have raw API data (e.g. from client.rest.get(Routes.user(id))), use the standalone CDN helpers. They work with id + hash and support size and extension options.',
        code: `import { cdnAvatarURL, cdnBannerURL } from '@fluxerjs/core';

// From REST response
const userData = await client.rest.get(Routes.user(userId));
const avatarUrl = cdnAvatarURL(userData.id, userData.avatar, { size: 256 });
const bannerUrl = cdnBannerURL(userData.id, profile?.banner ?? null, { size: 512 });

// Or use User: client.getOrCreateUser(userData) then user.displayAvatarURL()
const user = client.getOrCreateUser(userData);
const avatarUrl2 = user.displayAvatarURL({ size: 256 });`,
        language: 'javascript',
      },
      {
        title: 'Guild member and webhook avatars',
        description:
          'GuildMember has displayAvatarURL() (guild avatar or fallback to user) and bannerURL(). Webhook has avatarURL().',
        code: `// Member avatar (guild-specific or user fallback)
const memberAvatar = member.displayAvatarURL({ size: 128 });

// Webhook avatar
const webhookAvatar = webhook.avatarURL({ size: 64 });`,
        language: 'javascript',
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
          'MessageReactionAdd and MessageReactionRemove emit (reaction, user, messageId, channelId, emoji, userId). Use client.on(Events.X, handler) or client.events.MessageReactionAdd(handler).',
        code: `client.on(Events.MessageReactionAdd, async (reaction, user, messageId, channelId, emoji, userId) => {
  if (emoji.name === '👍') {
    console.log(\`User \${userId} voted yes on message \${messageId}\`);
    const message = await reaction.fetchMessage();
    if (message) await message.react('✅');
  }
});

client.on(Events.MessageReactionRemove, (reaction, user, messageId, channelId, emoji, userId) => {
  console.log(\`User \${userId} removed \${emoji.name} from message \${messageId}\`);
});`,
        language: 'javascript',
      },
      {
        title: 'Reaction Roles Example',
        description:
          'See examples/reaction-roles-bot.js for a full bot that assigns roles when users react to a message. Uses (reaction, user), Guild.fetchMember(), Guild.addRoleToMember()/removeRoleFromMember(), and guild.createRole() if you need to create roles programmatically. See the Roles guide for role CRUD.',
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
      'A complete guide to Discord webhooks—sending messages without a gateway, creating, editing, and managing webhooks.',
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
        title: 'Embeds without a title',
        description:
          'Embeds can use only a description—no title required. At least one of title, description, fields, or image is needed.',
        code: `await webhook.send({
  embeds: [
    new EmbedBuilder()
      .setDescription('Description-only embed works.')
      .setColor(0x5865f2)
      .toJSON(),
  ],
});`,
        language: 'javascript',
      },
      {
        title: 'Fetching & Listing Webhooks',
        description:
          'Fetch by ID or list channel/guild webhooks. Requires a logged-in bot. Fetched webhooks have no token and cannot send—but you can edit or delete them with bot auth.',
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
        title: 'Editing a Webhook',
        description:
          'Use webhook.edit() to change name, avatar, or (with bot auth) channel. With a token (e.g. from createWebhook or fromToken), you can update name and avatar. Without a token (fetched webhook), bot auth lets you also change the target channel.',
        code: `import { Client, Webhook } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
await client.login(process.env.FLUXER_BOT_TOKEN);

// With token (name and avatar only)
const webhook = Webhook.fromToken(client, webhookId, webhookToken);
await webhook.edit({ name: 'New Name', avatar: null });
// avatar: null clears the webhook avatar

// With bot auth (fetched webhook — can also move to another channel)
const fetched = await Webhook.fetch(client, webhookId);
await fetched.edit({
  name: 'Updated Name',
  channel_id: newChannelId,  // move webhook to different channel
});`,
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
    id: 'webhook-attachments-embeds',
    slug: 'webhook-attachments-embeds',
    title: 'Webhook Attachments & Embeds',
    description:
      'Send embeds with or without a title, and attach files to webhook messages—same API as channel messages.',
    category: 'webhooks',
    sections: [
      {
        title: 'Overview',
        description:
          'Webhooks support rich embeds and file attachments. Embeds can have just a description (no title required), and you can attach files the same way as with channel.send or message.reply.',
      },
      {
        title: 'Embeds Without a Title',
        description:
          'You do not need a title for embeds to work. At least one of title, description, fields, or image/thumbnail is required. A description-only embed is valid.',
        code: `import { Client, Webhook, EmbedBuilder } from '@fluxerjs/core';

const client = new Client({ intents: 0 });
const webhook = Webhook.fromToken(client, webhookId, webhookToken);

// Description only—no title
await webhook.send({
  embeds: [
    new EmbedBuilder()
      .setDescription('This embed has no title. Description-only works fine.')
      .setColor(0x5865f2)
      .setTimestamp()
      .toJSON(),
  ],
});`,
        language: 'javascript',
      },
      {
        title: 'Direct Attachments',
        description:
          'Attach files to webhook messages using the files array. Each file needs name and data (Blob, ArrayBuffer, or Uint8Array). Optional filename overrides the display name.',
        code: `import { Client, Webhook } from '@fluxerjs/core';
import { readFileSync } from 'fs';

const client = new Client({ intents: 0 });
const webhook = Webhook.fromToken(client, webhookId, webhookToken);

const buffer = readFileSync('report.pdf');
await webhook.send({
  content: 'Report attached',
  files: [
    { name: 'report.pdf', data: buffer },
    { name: 'log.txt', data: new TextEncoder().encode('Log content'), filename: 'log-2025.txt' },
  ],
});`,
        language: 'javascript',
      },
      {
        title: 'Full Example: Embed + Files',
        description:
          'Combine content, description-only embed, and file attachments in a single webhook send.',
        code: `import { Client, Webhook, EmbedBuilder } from '@fluxerjs/core';
import { readFileSync } from 'fs';

const client = new Client({ intents: 0 });
const webhook = Webhook.fromToken(client, webhookId, webhookToken);

await webhook.send({
  content: 'Build completed',
  embeds: [
    new EmbedBuilder()
      .setDescription('Deploy succeeded. See attachment for logs.')
      .setColor(0x57f287)
      .setTimestamp()
      .toJSON(),
  ],
  files: [{ name: 'deploy.log', data: readFileSync('deploy.log') }],
  username: 'CI Bot',
});`,
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
        title: 'Volume Control',
        description:
          'LiveKitRtcConnection supports setVolume(0-200) and getVolume(). 100 = normal, 50 = half, 200 = double. Affects current and future playback.',
        code: `import { LiveKitRtcConnection } from '@fluxerjs/voice';

if (connection instanceof LiveKitRtcConnection) {
  connection.setVolume(80); // 80% volume
  console.log('Current volume:', connection.getVolume());
}`,
        language: 'javascript',
      },
      {
        title: 'Stop and Leave',
        description:
          'Stop playback and disconnect. getConnection accepts channel ID or guild ID. leave(guildId) leaves all channels; leaveChannel(channelId) leaves a specific channel.',
        code: `// By channel ID (primary) or guild ID
const connection = voiceManager.getConnection(channelId) ?? voiceManager.getConnection(guildId);
connection?.stop();
if (connection) voiceManager.leaveChannel(connection.channel.id);
// Or leave all channels in the guild:
voiceManager.leave(guildId);`,
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
client.on(Events.MessageReactionAdd, (reaction, user, messageId, channelId, emoji, userId) => {});
client.on(Events.MessageReactionRemove, (reaction, user, messageId, channelId, emoji, userId) => {});

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
          'Listen for when users add or remove reactions. Handlers receive (reaction, user, messageId, channelId, emoji, userId). Use MessageReactionRemoveAll and MessageReactionRemoveEmoji for moderator actions.',
        code: `import { Client, Events } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageReactionAdd, (reaction, user, messageId, channelId, emoji, userId) => {
  const emojiStr = emoji.id ? \`<:\${emoji.name}:\${emoji.id}>\` : emoji.name;
  console.log(\`User \${userId} reacted with \${emojiStr} on message \${messageId}\`);

  // Filter for specific message (e.g. poll) or emoji
  if (emoji.name === '👍') {
    console.log('Someone voted yes!');
  }
});

client.on(Events.MessageReactionRemove, (reaction, user, messageId, channelId, emoji, userId) => {
  console.log(\`User \${userId} removed \${emoji.name} from message \${messageId}\`);
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
      {
        title: 'Gateway Dispatch Events Reference',
        description:
          'All events the Fluxer gateway can send. Use GatewayDispatchEvents from @fluxerjs/types for type-safe checks.',
        table: {
          headers: ['Category', 'Events'],
          codeColumns: [1],
          rows: [
            ['Connection & Session', 'Ready, Resumed, SessionsReplace'],
            [
              'User',
              'UserUpdate, UserSettingsUpdate, UserGuildSettingsUpdate, UserPinnedDmsUpdate, UserNoteUpdate, RecentMentionDelete',
            ],
            ['Saved Messages & Auth', 'SavedMessageCreate, SavedMessageDelete, AuthSessionChange'],
            ['Presence', 'PresenceUpdate'],
            [
              'Guild',
              'GuildCreate, GuildUpdate, GuildDelete, GuildMemberAdd, GuildMemberUpdate, GuildMemberRemove, GuildMembersChunk, GuildMemberListUpdate, GuildSync',
            ],
            ['Roles', 'GuildRoleCreate, GuildRoleUpdate, GuildRoleUpdateBulk, GuildRoleDelete'],
            ['Guild Assets', 'GuildEmojisUpdate, GuildStickersUpdate'],
            ['Moderation', 'GuildBanAdd, GuildBanRemove'],
            [
              'Channels',
              'ChannelCreate, ChannelUpdate, ChannelUpdateBulk, ChannelDelete, ChannelRecipientAdd, ChannelRecipientRemove, ChannelPinsUpdate, ChannelPinsAck',
            ],
            ['Passive', 'PassiveUpdates'],
            ['Invites', 'InviteCreate, InviteDelete'],
            [
              'Messages',
              'MessageCreate, MessageUpdate, MessageDelete, MessageDeleteBulk, MessageReactionAdd, MessageReactionRemove, MessageReactionRemoveAll, MessageReactionRemoveEmoji, MessageAck',
            ],
            ['Typing', 'TypingStart'],
            ['Webhooks', 'WebhooksUpdate'],
            ['Relationships', 'RelationshipAdd, RelationshipUpdate, RelationshipRemove'],
            ['Voice', 'VoiceStateUpdate, VoiceServerUpdate'],
            ['Calls', 'CallCreate, CallUpdate, CallDelete'],
            ['Favorites', 'FavoriteMemeCreate, FavoriteMemeUpdate, FavoriteMemeDelete'],
            [
              'SDK / Compatibility',
              'InteractionCreate, GuildIntegrationsUpdate, GuildScheduledEventCreate, GuildScheduledEventUpdate, GuildScheduledEventDelete',
            ],
          ],
        },
      },
      {
        title: 'Event Payload Reference',
        description:
          'Payload structure for each event. Handler receives (data) or (message), (reaction, user, ...) etc. Types: Gateway*DispatchData from @fluxerjs/types.',
        table: {
          headers: ['Event', 'Payload'],
          codeColumns: [0, 1],
          rows: [
            ['READY', '{ v, user, guilds, session_id, shard?, application: { id, flags } }'],
            ['RESUMED', '(no payload)'],
            ['SESSIONS_REPLACE', 'Array of session objects'],
            ['USER_UPDATE', 'APIUser — id, username, discriminator, global_name, avatar, etc.'],
            [
              'GUILD_CREATE',
              'APIGuild — id, name, icon, owner_id, channels[], members[], roles[], ...',
            ],
            ['GUILD_UPDATE', 'APIGuild — full guild object'],
            ['GUILD_DELETE', '{ id, unavailable? }'],
            [
              'GUILD_MEMBER_ADD',
              'APIGuildMember & { guild_id } — user, roles, nick, joined_at, ...',
            ],
            ['GUILD_MEMBER_UPDATE', '{ guild_id, roles, user, nick?, avatar?, joined_at?, ... }'],
            ['GUILD_MEMBER_REMOVE', '{ guild_id, user }'],
            [
              'GUILD_MEMBERS_CHUNK',
              '{ guild_id, members[], chunk_index, chunk_count, presences?, nonce? }',
            ],
            [
              'GUILD_MEMBER_LIST_UPDATE',
              '{ guild_id, id, member_count, online_count, groups[], ops[] }',
            ],
            ['GUILD_ROLE_CREATE', '{ guild_id, role: APIRole }'],
            ['GUILD_ROLE_UPDATE', '{ guild_id, role: APIRole }'],
            ['GUILD_ROLE_UPDATE_BULK', '{ guild_id, roles: APIRole[] }'],
            ['GUILD_ROLE_DELETE', '{ guild_id, role_id }'],
            ['GUILD_EMOJIS_UPDATE', '{ guild_id, emojis: APIEmoji[] }'],
            ['GUILD_STICKERS_UPDATE', '{ guild_id, stickers: APISticker[] }'],
            ['GUILD_BAN_ADD', '{ guild_id, user, reason? }'],
            ['GUILD_BAN_REMOVE', '{ guild_id, user }'],
            ['CHANNEL_CREATE', 'APIChannel — id, name, type, guild_id?, parent_id, ...'],
            ['CHANNEL_UPDATE', 'APIChannel'],
            ['CHANNEL_UPDATE_BULK', '{ channels: APIChannel[] }'],
            ['CHANNEL_DELETE', 'APIChannel'],
            ['CHANNEL_RECIPIENT_ADD', '{ channel_id, user }'],
            ['CHANNEL_RECIPIENT_REMOVE', '{ channel_id, user }'],
            ['CHANNEL_PINS_UPDATE', '{ channel_id, guild_id?, last_pin_timestamp? }'],
            ['CHANNEL_PINS_ACK', '{ channel_id, last_pin_timestamp? }'],
            ['INVITE_CREATE', 'APIInvite — code, guild, channel, inviter?, expires_at?, ...'],
            ['INVITE_DELETE', '{ code, channel_id, guild_id? }'],
            [
              'MESSAGE_CREATE',
              'APIMessage — id, channel_id, author, content, embeds, attachments, member?, ...',
            ],
            ['MESSAGE_UPDATE', 'APIMessage — partial (edited fields)'],
            ['MESSAGE_DELETE', '{ id, channel_id, guild_id?, content?, author_id? }'],
            ['MESSAGE_DELETE_BULK', '{ ids[], channel_id, guild_id? }'],
            [
              'MESSAGE_REACTION_ADD',
              '{ message_id, channel_id, user_id, guild_id?, emoji: { id, name, animated? } }',
            ],
            ['MESSAGE_REACTION_REMOVE', '{ message_id, channel_id, user_id, guild_id?, emoji }'],
            ['MESSAGE_REACTION_REMOVE_ALL', '{ message_id, channel_id, guild_id? }'],
            ['MESSAGE_REACTION_REMOVE_EMOJI', '{ message_id, channel_id, guild_id?, emoji }'],
            ['MESSAGE_ACK', '{ message_id, channel_id } — read receipt'],
            ['TYPING_START', '{ channel_id, user_id, timestamp, guild_id?, member? }'],
            [
              'VOICE_STATE_UPDATE',
              '{ guild_id?, channel_id, user_id, member?, session_id, deaf?, mute?, ... }',
            ],
            ['VOICE_SERVER_UPDATE', '{ token, guild_id, endpoint, connection_id? }'],
            ['WEBHOOKS_UPDATE', '{ guild_id, channel_id }'],
            [
              'PRESENCE_UPDATE',
              '{ user: { id }, guild_id?, status?, activities?, custom_status? }',
            ],
            ['GUILD_INTEGRATIONS_UPDATE', '{ guild_id }'],
            ['GUILD_SCHEDULED_EVENT_CREATE', '{ guild_id, id }'],
            ['GUILD_SCHEDULED_EVENT_UPDATE', '{ guild_id, id }'],
            ['GUILD_SCHEDULED_EVENT_DELETE', '{ guild_id, id }'],
            ['USER_NOTE_UPDATE', '{ id, note? }'],
            ['SAVED_MESSAGE_CREATE', 'APIMessage'],
            ['SAVED_MESSAGE_DELETE', '{ id }'],
            ['RELATIONSHIP_ADD / UPDATE', '{ id, type }'],
            ['RELATIONSHIP_REMOVE', '{ id }'],
            ['CALL_CREATE / UPDATE / DELETE', '{ id, channel_id, ... }'],
            ['INTERACTION_CREATE', 'APIApplicationCommandInteraction'],
          ],
        },
      },
    ],
  },
  {
    id: 'permissions',
    slug: 'permissions',
    title: 'Permissions',
    description:
      'Check member permissions (guild-level and channel-specific), bot permissions via guild.members.me, owner override, and PermissionFlags.',
    category: 'other',
    sections: [
      {
        title: 'Overview',
        description:
          'Use member.permissions for guild-level checks (roles only) and member.permissionsIn(channel) for channel-specific permissions (includes overwrites). The server owner always has all permissions.',
      },
      {
        title: 'Guild-level permissions',
        description:
          'member.permissions returns an object with has(permission). Use it for server-wide actions like ban, kick, manage roles.',
        code: `import { Client, Events, PermissionFlags } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

async function getMemberPerms(message) {
  const guild = message.guild ?? await message.client.guilds.fetch(message.guildId);
  if (!guild) return null;
  const member = guild.members.get(message.author.id) ?? await guild.fetchMember(message.author.id);
  return member?.permissions ?? null;
}

client.on(Events.MessageCreate, async (message) => {
  const perms = await getMemberPerms(message);
  if (!perms) return;

  if (perms.has(PermissionFlags.BanMembers)) {
    await message.reply('You can ban members.');
  }
  if (perms.has(PermissionFlags.Administrator)) {
    await message.reply('You have Administrator.');
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: "Bot's own permissions (guild.members.me)",
        description:
          "Use guild.members.me to get the bot's GuildMember. Returns null if not cached. Use guild.members.fetchMe() to load it. Discord.js parity.",
        code: `// Check if the bot can ban members in this guild
const guild = message.guild ?? await message.client.guilds.fetch(message.guildId);
const me = guild?.members.me ?? (guild ? await guild.members.fetchMe() : null);
if (me?.permissions.has(PermissionFlags.BanMembers)) {
  await message.reply('I have Ban Members permission.');
}`,
        language: 'javascript',
      },
      {
        title: "Editing the bot's guild profile (nickname)",
        description:
          "Use guild.members.me.edit({ nick }) to change the bot's nickname in that guild. Pass nick: null to clear and show the username. Requires Change Nickname permission (or bot has Manage Nicknames). See examples/ping-bot.js for a !setnick command.",
        code: `const guild = message.guild ?? await client.guilds.fetch(message.guildId);
const me = guild?.members.me ?? (guild ? await guild.members.fetchMe() : null);
if (me) {
  await me.edit({ nick: 'My Custom Nick' });
  await message.reply('Nickname updated!');
}
// Clear nickname (show username)
await me.edit({ nick: null });`,
        language: 'javascript',
      },
      {
        title: 'Owner override',
        description:
          'The guild owner automatically receives all permissions regardless of roles. No need to give the owner a role with Administrator.',
        code: `// When the message author is the server owner:
const perms = member.permissions;
perms.has(PermissionFlags.BanMembers);  // true
perms.has(PermissionFlags.ManageRoles); // true
perms.has(PermissionFlags.Administrator); // true
// ... all permission flags return true for the owner`,
        language: 'javascript',
      },
      {
        title: 'Channel-specific permissions',
        description:
          'member.permissionsIn(channel) applies channel overwrites. Use it when checking if a user can send messages, read history, or connect to voice in a specific channel.',
        code: `const channel = message.channel;
if (channel?.isSendable?.()) {
  const perms = member.permissionsIn(channel);
  if (perms.has(PermissionFlags.SendMessages)) {
    await channel.send('You can send here!');
  }
}`,
        language: 'javascript',
      },
      {
        title: 'Managing roles',
        description:
          'Create, fetch, edit, and delete roles with guild.createRole(), guild.fetchRoles(), guild.fetchRole(roleId), role.edit(), and role.delete(). Use resolvePermissionsToBitfield() for permission bitfields. See the Roles guide for full examples.',
        code: `// Create a role with specific permissions
const role = await guild.createRole({
  name: 'Mod',
  permissions: ['KickMembers', 'BanMembers', 'ManageMessages'],
});

// Add/remove roles from members
await guild.addRoleToMember(userId, roleId);
await guild.removeRoleFromMember(userId, roleId);`,
        language: 'javascript',
      },
      {
        title: 'PermissionFlags reference',
        description:
          'Common flags: BanMembers, KickMembers, Administrator, ManageRoles, ManageChannels, ManageGuild, ViewAuditLog, ManageMessages, SendMessages, EmbedLinks, AttachFiles, ReadMessageHistory, MentionEveryone, Connect, Speak, MuteMembers, ModerateMembers, CreateExpressions, PinMessages, BypassSlowmode.',
        code: `import { PermissionFlags } from '@fluxerjs/core';

// Check multiple
const canModerate = perms.has(PermissionFlags.BanMembers) || perms.has(PermissionFlags.Administrator);

// List all permissions the user has
const names = Object.keys(PermissionFlags).filter((name) =>
  perms.has(PermissionFlags[name])
);
await message.reply(\`Your permissions: \${names.join(', ')}\`);`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'moderation',
    slug: 'moderation',
    title: 'Moderation',
    description:
      'Implement ban, kick, and unban commands. Check permissions first (see Permissions guide).',
    category: 'other',
    sections: [
      {
        title: 'Overview',
        description:
          'Use guild.ban(), guild.kick(), and guild.unban() for moderation. Always check member permissions before allowing moderation commands—see the Permissions guide.',
      },
      {
        title: 'Ban a member',
        description:
          'guild.ban(userId, options) bans a user. Pass reason for the audit log. Requires BanMembers permission.',
        code: `const userId = target?.match(/^<@!?(\\d+)>$/)?.[1] ?? target;
if (userId) {
  await guild.ban(userId, { reason: rest.join(' ') || undefined });
  await message.reply(\`Banned <@\${userId}>.\`);
}`,
        language: 'javascript',
      },
      {
        title: 'Kick a member',
        description:
          'guild.kick(userId, options) kicks a user from the guild. Pass reason for the audit log. Requires KickMembers permission.',
        code: `const userId = target?.match(/^<@!?(\\d+)>$/)?.[1] ?? target;
if (userId) {
  await guild.kick(userId, { reason: rest.join(' ') || undefined });
  await message.reply(\`Kicked <@\${userId}>.\`);
}`,
        language: 'javascript',
      },
      {
        title: 'Unban a user',
        description: 'guild.unban(userId, reason?) removes a ban. Requires BanMembers permission.',
        code: `const userId = target?.match(/^<@!?(\\d+)>$/)?.[1] ?? target;
if (userId) {
  await guild.unban(userId, rest.join(' ') || undefined);
  await message.reply(\`Unbanned <@\${userId}>.\`);
}`,
        language: 'javascript',
      },
      {
        title: 'Full moderation example',
        description:
          'See examples/moderation-bot.js for a complete bot with !ban, !kick, !unban, and !perms commands.',
        code: `import { Client, Events, PermissionFlags } from '@fluxerjs/core';

const PREFIX = '!';
const client = new Client({ intents: 0 });

async function getModeratorPerms(message) {
  const guild = message.guild ?? await message.client.guilds.fetch(message.guildId);
  if (!guild) return null;
  const member = guild.members.get(message.author.id);
  const resolved = member ?? await guild.fetchMember(message.author.id);
  return resolved?.permissions ?? null;
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content?.startsWith(PREFIX)) return;
  const [cmd, target, ...rest] = message.content.slice(PREFIX.length).trim().split(/\\s+/);
  const perms = await getModeratorPerms(message);
  if (!perms) return;

  const guild = message.guild ?? await message.client.guilds.fetch(message.guildId);
  if (!guild) return;

  if (cmd === 'ban' && (perms.has(PermissionFlags.BanMembers) || perms.has(PermissionFlags.Administrator))) {
    const userId = target?.match(/^<@!?(\\d+)>$/)?.[1] ?? target;
    if (userId) {
      await guild.ban(userId, { reason: rest.join(' ') || undefined });
      await message.reply(\`Banned <@\${userId}>.\`);
    }
  }
  if (cmd === 'kick' && (perms.has(PermissionFlags.KickMembers) || perms.has(PermissionFlags.Administrator))) {
    const userId = target?.match(/^<@!?(\\d+)>$/)?.[1] ?? target;
    if (userId) {
      await guild.kick(userId, { reason: rest.join(' ') || undefined });
      await message.reply(\`Kicked <@\${userId}>.\`);
    }
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
    ],
  },
  {
    id: 'roles',
    slug: 'roles',
    title: 'Roles',
    description:
      'Create, fetch, edit, and delete guild roles. Use PermissionFlags and resolvePermissionsToBitfield for permission bitfields.',
    category: 'other',
    sections: [
      {
        title: 'Overview',
        description:
          "Guild roles can be created, fetched, edited, and deleted. Use guild.createRole(), guild.fetchRoles(), guild.fetchRole(roleId), role.edit(), and role.delete(). Requires Manage Roles permission. For permission bitfields, use resolvePermissionsToBitfield() or role.has() to check a role's permissions.",
      },
      {
        title: 'Create a role',
        description:
          'Use guild.createRole() to create a new role. Pass name, permissions, color, hoist, mentionable, unicode_emoji, position, or hoist_position. Permissions accept PermissionResolvable (string, number, array) for convenience.',
        code: `import { Client, Events, PermissionFlags, resolvePermissionsToBitfield } from '@fluxerjs/core';

const client = new Client({ intents: 0 });

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!createrole' && message.guildId) {
    const guild = client.guilds.get(message.guildId) ?? await client.guilds.fetch(message.guildId);
    if (!guild) return;

    const role = await guild.createRole({
      name: 'Moderator',
      permissions: ['BanMembers', 'KickMembers', 'ManageMessages'],
      color: 0x5865f2,
      hoist: true,
      mentionable: false,
    });
    await message.reply(\`Created role \${role.name} (\${role.id})\`);
  }
});

await client.login(process.env.FLUXER_BOT_TOKEN);`,
        language: 'javascript',
      },
      {
        title: 'Fetch roles',
        description:
          'Use guild.fetchRoles() to fetch all roles from the API and cache them. Use guild.fetchRole(roleId) to fetch a single role by ID. Throws FluxerError with ROLE_NOT_FOUND on 404.',
        code: `// Fetch all roles (updates guild.roles cache)
const roles = await guild.fetchRoles();

// Fetch a single role by ID
const role = await guild.fetchRole(roleId);
console.log(role.name, role.color);`,
        language: 'javascript',
      },
      {
        title: 'Edit a role',
        description:
          'Use role.edit() to update a role. Pass any of name, permissions, color, hoist, mentionable, unicode_emoji, position, hoist_position. Permissions accept PermissionResolvable.',
        code: `const role = guild.roles.get(roleId) ?? await guild.fetchRole(roleId);
await role.edit({
  name: 'Senior Mod',
  permissions: ['BanMembers', 'KickMembers', 'ManageMessages', 'ManageRoles'],
  color: 0x57f287,
});`,
        language: 'javascript',
      },
      {
        title: 'Delete a role',
        description:
          'Use role.delete() to remove a role. The role is removed from guild.roles cache.',
        code: `const role = guild.roles.get(roleId) ?? await guild.fetchRole(roleId);
await role.delete();
await message.reply('Role deleted.');`,
        language: 'javascript',
      },
      {
        title: 'Check role permissions',
        description:
          'Use role.has(permission) to check if a role has a specific permission. Administrator implies all permissions.',
        code: `import { PermissionFlags } from '@fluxerjs/core';

if (role.has(PermissionFlags.BanMembers)) {
  await message.reply('This role can ban members.');
}
if (role.has('ManageChannels')) {
  await message.reply('This role can manage channels.');
}`,
        language: 'javascript',
      },
      {
        title: 'Permission bitfields for create/edit',
        description:
          'When creating or editing roles, pass permissions as a string (API format), number, PermissionString, or array. Use resolvePermissionsToBitfield() to combine multiple permissions. Handles high bits (PinMessages, ModerateMembers, etc.) correctly with BigInt.',
        code: `import { resolvePermissionsToBitfield, PermissionFlags } from '@fluxerjs/core';

// Single permission by name
resolvePermissionsToBitfield('SendMessages');  // "2048"

// Array of permissions (OR'd together)
resolvePermissionsToBitfield(['SendMessages', 'ViewChannel', 'ReadMessageHistory']);
// Returns combined bitfield as string

// From PermissionFlags enum
resolvePermissionsToBitfield(PermissionFlags.BanMembers);  // "4"`,
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
  media: 'Media',
  events: 'Events',
  other: 'Other',
};

/** Category order for guides index (Getting Started first, etc). */
export const CATEGORY_ORDER: string[] = [
  'getting-started',
  'sending-messages',
  'media',
  'webhooks',
  'voice',
  'events',
  'other',
];

/** Slugs of guides to show as quick links on the guides index. */
export const QUICK_LINK_SLUGS: string[] = [
  'installation',
  'basic-bot',
  'sending-without-reply',
  'embeds',
  'attachments',
  'attachments-by-url',
  'permissions',
  'moderation',
  'slash-commands',
];

export function getCategoryLabel(cat?: string): string {
  return (cat && CATEGORY_LABELS[cat]) ?? 'Guides';
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
