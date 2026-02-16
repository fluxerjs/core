/**
 * Fluxer Example Bot
 *
 * Demonstrates prefix commands, embeds, DMs, voice join, audio, and video playback.
 * DMs: !dm (DM yourself), !dmuser @user [message] (DM another user).
 * Voice: !play (joins your VC and plays WebM/Opus audio via youtube-dl-exec). No FFmpeg.
 * Video: !playvideo [url] (streams MP4 in your VC; supports YouTube links or direct MP4; default demo).
 *   Set FLUXER_VIDEO_FFMPEG=1 to use FFmpeg decoding (recommended on macOS; avoids node-webcodecs crashes).
 * !stop stops playback and leaves.
 *
 * Usage (from repo root after npm install && npm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/ping-bot.js
 *
 * Optional env: FLUXER_API_URL for custom API base; VOICE_DEBUG=1 for voice connection logs.
 */

import youtubedl from 'youtube-dl-exec';
import {
  Client,
  Events,
  EmbedBuilder,
  Routes,
  User,
  VoiceChannel,
  cdnBannerURL,
} from '@fluxerjs/core';
import { getVoiceManager, LiveKitRtcConnection } from '@fluxerjs/voice';

/** Fixed non‑copyrighted track; we get a direct WebM/Opus URL so the voice package can play without FFmpeg. */
const PLAY_URL = 'https://www.youtube.com/watch?v=eVTXPUF4Oz4';
const YTDLP_FORMAT = 'bestaudio[ext=webm][acodec=opus]/bestaudio[ext=webm]/bestaudio';

/** Default MP4 video URL for !playvideo (short public domain clip). Must be direct MP4 (H.264). */
const DEFAULT_VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';

/** yt-dlp format for MP4 video (prefer 1080p, then 720p, 360p, then best). */
const YTDLP_VIDEO_FORMAT =
  'best[height<=1080][ext=mp4]/best[height<=1080]/22/18/best[ext=mp4]/best';

/** Regex for YouTube and similar sites that yt-dlp supports for video extraction. */
const YOUTUBE_LIKE = /youtube\.com|youtu\.be|yt\.be/i;

async function getStreamUrl(url) {
  const result = await youtubedl(
    url,
    {
      getUrl: true,
      f: YTDLP_FORMAT,
      formatSort: 'acodec:opus',
      noWarnings: true,
      noPlaylist: true,
    },
    { timeout: 15000 },
  );
  return String(result ?? '').trim();
}

/** Get a direct MP4 video URL from YouTube or similar. Returns null on failure. */
async function getVideoUrl(url) {
  const result = await youtubedl(
    url,
    {
      getUrl: true,
      f: YTDLP_VIDEO_FORMAT,
      noWarnings: true,
      noPlaylist: true,
    },
    { timeout: 20000 },
  );
  return String(result ?? '').trim() || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = '!';

/** Per-guild play state for auto-reconnect when LiveKit server sends leave. */
const playState = new Map();

function setPlayState(guildId, channel, streamUrl) {
  playState.set(guildId, { channel, streamUrl });
}

function clearPlayState(guildId) {
  playState.delete(guildId);
}
const BRAND_COLOR = 0x4641d9;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format milliseconds into human-readable uptime. */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

/** Measure REST API latency by timing a lightweight request. */
async function measureApiLatency(client) {
  const start = Date.now();
  try {
    await client.rest.get(Routes.gatewayBot());
  } catch {
    // Ignore errors; we just want the round-trip time
  }
  return Date.now() - start;
}

/** Resolve a user ID from the first argument: mention (<@id> or <@!id>) or raw snowflake. Returns null if invalid. */
function resolveUserId(arg, authorId) {
  if (!arg) return authorId;
  const mentionMatch = arg.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d{17,19}$/.test(arg)) return arg;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Handlers
// ─────────────────────────────────────────────────────────────────────────────

const commands = new Map();

commands.set('ping', {
  description: 'Check bot and API latency',
  async execute(message, client) {
    const apiLatency = await measureApiLatency(client);

    const embed = new EmbedBuilder()
      .setTitle('Pong!')
      .setColor(BRAND_COLOR)
      .addFields({ name: 'API Latency', value: `\`${apiLatency}ms\``, inline: true })
      .setFooter({ text: 'Fluxer Bot' })
      .setTimestamp();

    await message.reply({ embeds: [embed.toJSON()] });
  },
});

commands.set('info', {
  description: 'Display bot information',
  async execute(message, client) {
    const uptime = client.readyAt ? Date.now() - client.readyAt.getTime() : 0;
    const apiLatency = await measureApiLatency(client);

    const embed = new EmbedBuilder()
      .setTitle('Bot Information')
      .setColor(BRAND_COLOR)
      .setThumbnail(client.user?.avatarURL?.() ?? null)
      .addFields(
        { name: 'Username', value: client.user?.username ?? 'Unknown', inline: true },
        { name: 'Guilds', value: `${client.guilds.size}`, inline: true },
        { name: 'Channels', value: `${client.channels.size}`, inline: true },
        { name: 'Uptime', value: formatUptime(uptime), inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
      )
      .setFooter({ text: 'Powered by @fluxerjs/core' })
      .setTimestamp();

    await message.reply({ embeds: [embed.toJSON()] });
  },
});

commands.set('userinfo', {
  description: "Show a user's profile (mention or user ID); no arg = yourself",
  async execute(message, client, args) {
    const userId = resolveUserId(args[0], message.author.id);
    if (!userId) {
      await message.reply(
        'Provide a user mention (`@user`) or a user ID. Example: `!userinfo @Someone` or `!userinfo 123456789012345678`',
      );
      return;
    }
    let userData;
    let profileData = null;
    try {
      userData = await client.rest.get(Routes.user(userId));
    } catch {
      await message.reply(
        'Could not fetch that user. They may not exist or the ID may be invalid.',
      );
      return;
    }
    try {
      profileData = await client.rest.get(Routes.userProfile(userId));
    } catch {
      // Profile may not be available for all users or bots
    }
    const user = client.getOrCreateUser(userData);
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    const profile = profileData?.user_profile;
    const bannerUrl =
      profile?.banner != null && profile.banner !== ''
        ? cdnBannerURL(userData.id, profile.banner, { size: 512 })
        : null;
    const accentColor =
      profile && (profile.accent_color ?? profile.banner_color) != null
        ? Number(profile.accent_color ?? profile.banner_color)
        : userData.avatar_color != null
          ? Number(userData.avatar_color)
          : BRAND_COLOR;
    const embed = new EmbedBuilder()
      .setTitle('User profile')
      .setColor(accentColor)
      .setThumbnail(avatarUrl);
    if (bannerUrl) embed.setImage(bannerUrl);
    embed
      .addFields(
        { name: 'Username', value: userData.username ?? '—', inline: true },
        {
          name: 'Display name',
          value: userData.global_name ?? userData.username ?? '—',
          inline: true,
        },
        { name: 'ID', value: `\`${userData.id}\``, inline: true },
        { name: 'Bot', value: userData.bot ? 'Yes' : 'No', inline: true },
        { name: 'Discriminator', value: userData.discriminator ?? '—', inline: true },
        {
          name: 'Avatar color',
          value:
            userData.avatar_color != null
              ? `#${Number(userData.avatar_color).toString(16).padStart(6, '0')}`
              : '—',
          inline: true,
        },
      )
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();
    if (profile && typeof profile === 'object') {
      const extra = [];
      if (profile.pronouns != null && profile.pronouns !== '')
        extra.push({
          name: 'Pronouns',
          value: String(profile.pronouns).slice(0, 40),
          inline: true,
        });
      if (profile.bio != null && profile.bio !== '')
        extra.push({ name: 'Bio', value: String(profile.bio).slice(0, 1024) || '—' });
      if (profile.banner != null && profile.banner !== '')
        extra.push({ name: 'Banner', value: 'Set', inline: true });
      const accent = profile.accent_color ?? profile.banner_color;
      if (accent != null)
        extra.push({
          name: 'Accent color',
          value: `#${Number(accent).toString(16).padStart(6, '0')}`,
          inline: true,
        });
      if (extra.length) embed.addFields(...extra);
    }
    try {
      await message.reply({ embeds: [embed.toJSON()] });
    } catch (err) {
      const fallback = `**${userData.username ?? userData.global_name ?? 'User'}** (ID: \`${userData.id}\`) — Could not send full embed (${err.statusCode === 502 ? 'server error' : 'error'}). Try again.`;
      await message.reply(fallback).catch(() => {});
    }
  },
});

const VERIFICATION_LEVELS = ['None', 'Low', 'Medium', 'High', 'Very High'];
const MFA_LEVELS = ['None', 'Elevated'];
const EXPLICIT_CONTENT_FILTERS = ['Disabled', 'Members without roles', 'All members'];
const DEFAULT_NOTIFICATION_LEVELS = ['All messages', 'Only mentions'];

commands.set('serverinfo', {
  description: "Show this server's details",
  async execute(message, client, args) {
    const guildId = args[0] ?? message.guildId;
    if (!guildId) {
      await message.reply(
        'Use this command in a server or provide a guild ID: `!serverinfo [guild_id]`',
      );
      return;
    }
    let data;
    try {
      data = await client.rest.get(Routes.guild(guildId));
    } catch {
      await message.reply('Could not fetch that server. Check the ID or permissions.');
      return;
    }
    const iconUrl = data.icon
      ? `https://fluxerusercontent.com/icons/${data.id}/${data.icon}.png?size=256`
      : null;
    const embed = new EmbedBuilder()
      .setTitle(data.name ?? 'Server')
      .setColor(BRAND_COLOR)
      .setThumbnail(iconUrl)
      .addFields(
        { name: 'ID', value: `\`${data.id}\``, inline: true },
        { name: 'Owner ID', value: `\`${data.owner_id ?? '—'}\``, inline: true },
        {
          name: 'Verification',
          value: VERIFICATION_LEVELS[data.verification_level] ?? String(data.verification_level),
          inline: true,
        },
        {
          name: 'MFA level',
          value: MFA_LEVELS[data.mfa_level] ?? String(data.mfa_level),
          inline: true,
        },
        {
          name: 'AFK timeout',
          value: data.afk_timeout != null ? `${data.afk_timeout}s` : '—',
          inline: true,
        },
        { name: 'NSFW level', value: String(data.nsfw_level ?? 0), inline: true },
        {
          name: 'Explicit content filter',
          value:
            EXPLICIT_CONTENT_FILTERS[data.explicit_content_filter] ??
            String(data.explicit_content_filter ?? 0),
          inline: true,
        },
        {
          name: 'Default notifications',
          value: DEFAULT_NOTIFICATION_LEVELS[data.default_message_notifications] ?? '—',
          inline: true,
        },
        {
          name: 'Vanity URL',
          value: data.vanity_url_code ? `/${data.vanity_url_code}` : '—',
          inline: true,
        },
        {
          name: 'System channel ID',
          value: data.system_channel_id ? `\`${data.system_channel_id}\`` : '—',
          inline: true,
        },
        {
          name: 'Rules channel ID',
          value: data.rules_channel_id ? `\`${data.rules_channel_id}\`` : '—',
          inline: true,
        },
        {
          name: 'AFK channel ID',
          value: data.afk_channel_id ? `\`${data.afk_channel_id}\`` : '—',
          inline: true,
        },
        { name: 'Features', value: data.features?.length ? data.features.join(', ') : '—' },
      )
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();
    if (data.banner)
      embed.setImage(
        `https://fluxerusercontent.com/banners/${data.id}/${data.banner}.png?size=512`,
      );
    try {
      await message.reply({ embeds: [embed.toJSON()] });
    } catch {
      await message
        .reply(`Server: **${data.name}** (ID: \`${data.id}\`). Could not send embed.`)
        .catch(() => {});
    }
  },
});

function resolveRoleIdOrName(arg) {
  if (!arg) return null;
  const mentionMatch = arg.match(/^<@&(\d+)>$/);
  if (mentionMatch) return { type: 'id', value: mentionMatch[1] };
  if (/^\d{17,19}$/.test(arg)) return { type: 'id', value: arg };
  return { type: 'name', value: arg };
}

commands.set('roleinfo', {
  description: "Show a role's details (role ID, mention, or name)",
  async execute(message, client, args) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('Use this command in a server.');
      return;
    }
    const resolved = resolveRoleIdOrName(args[0]);
    if (!resolved) {
      await message.reply(
        'Provide a role ID, role mention (`@Role`), or role name. Example: `!roleinfo Moderator`',
      );
      return;
    }
    let roles;
    try {
      roles = await client.rest.get(Routes.guildRoles(guildId));
    } catch {
      await message.reply('Could not fetch roles for this server.');
      return;
    }
    const roleList = Array.isArray(roles) ? roles : Object.values(roles ?? {});
    const role =
      roleList.find((r) =>
        resolved.type === 'id'
          ? r.id === resolved.value
          : r.name && r.name.toLowerCase() === resolved.value.toLowerCase(),
      ) ?? null;
    if (!role) {
      await message.reply(
        resolved.type === 'id' ? 'No role found with that ID.' : 'No role found with that name.',
      );
      return;
    }
    const color = role.color != null && role.color !== 0 ? role.color : BRAND_COLOR;
    const permStr = role.permissions ? String(role.permissions).slice(0, 1024) : '—';
    const embed = new EmbedBuilder()
      .setTitle(role.name ?? 'Role')
      .setColor(color)
      .addFields(
        { name: 'ID', value: `\`${role.id}\``, inline: true },
        { name: 'Name', value: role.name ?? '—', inline: true },
        { name: 'Position', value: String(role.position ?? 0), inline: true },
        {
          name: 'Color',
          value:
            role.color != null && role.color !== 0
              ? `#${Number(role.color).toString(16).padStart(6, '0')}`
              : 'Default',
          inline: true,
        },
        { name: 'Hoist', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Unicode emoji', value: role.unicode_emoji ?? '—', inline: true },
        {
          name: 'Hoist position',
          value: role.hoist_position != null ? String(role.hoist_position) : '—',
          inline: true,
        },
        { name: 'Permissions', value: permStr },
      )
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();
    try {
      await message.reply({ embeds: [embed.toJSON()] });
    } catch {
      await message
        .reply(`Role: **${role.name}** (ID: \`${role.id}\`). Could not send embed.`)
        .catch(() => {});
    }
  },
});

commands.set('dm', {
  description: 'DM yourself (demo of user.send)',
  async execute(message) {
    try {
      await message.author.send('You requested a DM! This is a direct message from the bot.');
      await message.reply('Check your DMs! 📬');
    } catch {
      await message.reply('Could not DM you. You may have DMs disabled.').catch(() => {});
    }
  },
});

commands.set('dmuser', {
  description: 'DM a user: !dmuser @user [message]',
  async execute(message, client, args) {
    const userId = resolveUserId(args[0], null);
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

commands.set('react', {
  description: 'Reply with a message and add reactions',
  async execute(message) {
    const reply = await message.reply('React below! 👇');
    await reply.react('👍');
    await reply.react('❤️');
    await reply.react('🎉');
  },
});

commands.set('editembed', {
  description: 'Demonstrate editing an existing message embed',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('Original Embed')
      .setDescription('This embed will be edited in 2 seconds...')
      .setColor(BRAND_COLOR)
      .setFooter({ text: 'Editing embeds demo' })
      .setTimestamp();

    const reply = await message.reply({ embeds: [embed.toJSON()] });

    // Wait 2 seconds, then edit the embed
    await new Promise((r) => setTimeout(r, 2000));

    const updatedEmbed = new EmbedBuilder()
      .setTitle('Edited Embed')
      .setDescription(
        'The Fluxer API supports editing message embeds via `message.edit({ embeds: [...] })`.',
      )
      .setColor(0x57f287)
      .addFields(
        { name: 'Original', value: 'First state', inline: true },
        { name: 'Edited', value: 'Updated state', inline: true },
      )
      .setFooter({ text: 'Embed was successfully edited' })
      .setTimestamp();

    await reply.edit({ embeds: [updatedEmbed] });
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
      .setDescription(`Use \`${PREFIX}<command>\` to run a command.`)
      .setColor(BRAND_COLOR)
      .addFields(...fields)
      .setFooter({ text: `Prefix: ${PREFIX}` })
      .setTimestamp();

    await message.reply({ embeds: [embed.toJSON()] });
  },
});

commands.set('play', {
  description: 'Join your voice channel and play music (WebM/Opus, no FFmpeg)',
  async execute(message, client) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('This command only works in a server.');
      return;
    }
    const voiceManager = getVoiceManager(client);
    const voiceChannelId = voiceManager.getVoiceChannelId(guildId, message.author.id);
    if (!voiceChannelId) {
      await message.reply('Join a voice channel first.');
      return;
    }
    const channel = client.channels.get(voiceChannelId);
    if (!(channel instanceof VoiceChannel)) {
      await message.reply('Could not find that voice channel.');
      return;
    }
    try {
      const streamUrl = await getStreamUrl(PLAY_URL);
      if (!streamUrl) {
        await message.reply('Could not get stream URL. Is youtube-dl-exec installed?');
        return;
      }
      setPlayState(guildId, channel, streamUrl);
      const connection = await voiceManager.join(channel);
      connection.on?.('serverLeave', async () => {
        const state = playState.get(guildId);
        if (!state) return;
        console.log('[voice] LiveKit server sent leave; auto-reconnecting...');
        try {
          const conn = await voiceManager.join(state.channel);
          await conn.play(state.streamUrl);
        } catch (e) {
          console.error('[voice] Auto-reconnect failed:', e);
          playState.delete(guildId);
        }
      });
      await connection.play(streamUrl);
      await message.reply('Playing in your voice channel.');
    } catch (err) {
      console.error('Play error:', err);
      await message.reply('Failed to join or play.').catch(() => {});
    }
  },
});

commands.set('playvideo', {
  description: 'Stream video in your VC (!playvideo [YouTube URL or MP4 URL])',
  async execute(message, client, args) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('This command only works in a server.');
      return;
    }
    const voiceManager = getVoiceManager(client);
    const voiceChannelId = voiceManager.getVoiceChannelId(guildId, message.author.id);
    if (!voiceChannelId) {
      await message.reply('Join a voice channel first.');
      return;
    }
    const channel = client.channels.get(voiceChannelId);
    if (!(channel instanceof VoiceChannel)) {
      await message.reply('Could not find that voice channel.');
      return;
    }
    const inputUrl = args[0]?.trim() || DEFAULT_VIDEO_URL;
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      await message.reply(
        'Provide a valid URL: YouTube link or direct MP4. Example: `!playvideo https://youtube.com/watch?v=...`',
      );
      return;
    }
    try {
      let videoUrl = inputUrl;
      if (YOUTUBE_LIKE.test(inputUrl)) {
        await message.reply('Fetching video URL from YouTube...').catch(() => {});
        const resolved = await getVideoUrl(inputUrl);
        if (!resolved) {
          await message
            .reply('Could not get video URL. Is youtube-dl-exec installed?')
            .catch(() => {});
          return;
        }
        videoUrl = resolved;
      }
      const connection = await voiceManager.join(channel);
      if (!(connection instanceof LiveKitRtcConnection)) {
        await message.reply(
          'Video requires LiveKit voice (this server may use a different voice backend).',
        );
        return;
      }
      if (!connection.isConnected()) {
        await message.reply('Voice connection not ready. Try again in a moment.');
        return;
      }
      await connection.playVideo(videoUrl, { source: 'screenshare' });
      await message.reply(`Streaming video in your voice channel. Use \`${PREFIX}stop\` to leave.`);
    } catch (err) {
      console.error('Playvideo error:', err);
      await message.reply('Failed to join or stream video.').catch(() => {});
    }
  },
});

commands.set('stop', {
  description: 'Stop audio/video playback and leave voice channel',
  async execute(message, client) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('This command only works in a server.');
      return;
    }
    const voiceManager = getVoiceManager(client);
    const connection = voiceManager.getConnection(guildId);
    if (connection) {
      clearPlayState(guildId);
      connection.stop();
      voiceManager.leave(guildId);
      await message.reply('Stopped and left the voice channel.');
    } else {
      await message.reply('Not in a voice channel in this server.');
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Client Setup
// ─────────────────────────────────────────────────────────────────────────────

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client({
  intents: 0,
  rest: process.env.FLUXER_API_URL ? { api: process.env.FLUXER_API_URL } : undefined,
  presence: {
    status: 'online',
    custom_status: { text: 'Watching the server' },
  },
});

// Create VoiceManager before login so it receives VoiceStatesSync from READY/GUILD_CREATE
// and can see users who were already in a voice channel when the bot started.
getVoiceManager(client);

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
  console.log(`Serving ${client.guilds.size} guild(s)`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots and messages without content
  if (message.author.bot || !message.content) return;

  // Ignore messages that don't start with the prefix
  const content = message.content.trim();
  if (!content.startsWith(PREFIX)) return;

  // Parse command and arguments
  const args = content.slice(PREFIX.length).split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  // Execute command if it exists
  const command = commands.get(commandName);
  if (command) {
    try {
      await command.execute(message, client, args);
    } catch (err) {
      console.error(`Error executing ${commandName}:`, err);
      await message.reply('An error occurred while running that command.').catch(() => {});
    }
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));
client.on(Events.Debug, (msg) => console.log('[debug]', msg));

// Optional: log voice gateway events when VOICE_DEBUG=1 (helps diagnose connection timeouts)
if (process.env.VOICE_DEBUG === '1' || process.env.VOICE_DEBUG === 'true') {
  client.on(Events.VoiceStateUpdate, (d) =>
    console.log('[voice] VoiceStateUpdate', {
      guild_id: d.guild_id,
      user_id: d.user_id,
      channel_id: d.channel_id,
    }),
  );
  client.on(Events.VoiceServerUpdate, (d) =>
    console.log('[voice] VoiceServerUpdate', {
      guild_id: d.guild_id,
      endpoint: d.endpoint ? 'present' : 'null',
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

try {
  await client.login(token);
  console.log('Gateway connected');
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
