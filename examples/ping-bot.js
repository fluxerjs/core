/**
 * Fluxer Example Bot
 *
 * Demonstrates prefix commands, embeds, DMs, voice join, audio, and video playback.
 * DMs: !dm (DM yourself), !dmuser @user [message] (DM another user).
 * Guild profile: !setnick [nickname] (change nickname), !setavatar [url] (change guild avatar).
 * Voice: !play (joins your VC and plays WebM/Opus audio via youtube-dl-exec). No FFmpeg.
 * Video: !playvideo [url] [480p|720p|1080p|1440p|4k] (streams MP4 in your VC; default 720p 30fps).
 *   Resolution forces FFmpeg path. Set FLUXER_VIDEO_FFMPEG=1 to use FFmpeg without resolution.
 * !stop stops playback and leaves.
 *
 * Usage (from repo root after npm install && npm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/ping-bot.js
 *
 * Optional env: FLUXER_API_URL for custom API base; VOICE_DEBUG=1 for voice connection logs;
 * SETAVATAR_DEBUG=1 for guild avatar request/response logs.
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
  UserFlagsBits,
  PermissionFlags,
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

commands.set('setnick', {
  description: "Change the bot's nickname in this server (!setnick [nickname])",
  async execute(message, client, args) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('Use this command in a server.');
      return;
    }
    const guild = client.guilds.get(guildId) ?? (await client.guilds.fetch(guildId));
    if (!guild) {
      await message.reply('Could not find this server.');
      return;
    }
    const me = guild.members.me ?? (await guild.members.fetchMe());
    const newNick = args.join(' ').trim() || null;
    try {
      await me.edit({ nick: newNick });
      await message.reply(
        newNick
          ? `Nickname set to \`${newNick}\` in this server.`
          : 'Nickname cleared (showing username again).',
      );
    } catch {
      await message
        .reply('Failed to change nickname. The bot may need Change Nickname permission.')
        .catch(() => {});
    }
  },
});

const SETAVATAR_DEBUG =
  process.env.SETAVATAR_DEBUG === '1' || process.env.SETAVATAR_DEBUG === 'true';

commands.set('setavatar', {
  description: "Change the bot's guild avatar (!setavatar [image URL] or !setavatar clear)",
  async execute(message, client, args) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('Use this command in a server.');
      return;
    }
    const guild = client.guilds.get(guildId) ?? (await client.guilds.fetch(guildId));
    if (!guild) {
      await message.reply('Could not find this server.');
      return;
    }
    const me = guild.members.me ?? (await guild.members.fetchMe());
    const arg = args[0]?.toLowerCase();
    if (arg === 'clear' || arg === 'reset') {
      try {
        if (SETAVATAR_DEBUG) {
          console.log(
            '[setavatar] PATCH /guilds/%s/members/@me with avatar: null (clear)',
            guildId,
          );
        }
        await me.edit({ avatar: null });
        if (SETAVATAR_DEBUG) {
          const updated = await guild.fetchMember(me.id);
          console.log('[setavatar] Response: avatar=%s', updated.avatar ?? 'null');
        }
        await message.reply('Guild avatar cleared. Showing global avatar again.');
      } catch (err) {
        if (SETAVATAR_DEBUG) console.error('[setavatar] Clear failed:', err);
        await message.reply('Failed to clear guild avatar.').catch(() => {});
      }
      return;
    }
    const url = args[0]?.trim();
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      await message.reply(
        'Provide an image URL: `!setavatar https://example.com/image.png` or `!setavatar clear` to reset.',
      );
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        await message.reply(`Could not fetch image: ${res.status}`);
        return;
      }
      const contentType = res.headers.get('content-type') ?? 'image/png';
      const mime = contentType.split(';')[0].trim();
      if (!mime.startsWith('image/')) {
        await message.reply('URL must point to an image (png, jpeg, gif, webp).');
        return;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const base64 = buf.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;
      if (SETAVATAR_DEBUG) {
        console.log(
          '[setavatar] PATCH /guilds/%s/members/@me with avatar (dataUri len=%d, mime=%s)',
          guildId,
          dataUri.length,
          mime,
        );
      }
      await me.edit({ avatar: dataUri });
      const updated = await guild.fetchMember(me.id);
      if (SETAVATAR_DEBUG) {
        console.log('[setavatar] Response: avatar=%s', updated.avatar ?? 'null');
      }
      if (dataUri && !updated.avatar) {
        await message.reply(
          'Request succeeded but the avatar was not applied. On Fluxer, guild avatars require a premium subscription—bots cannot set guild avatars.',
        );
      } else {
        await message.reply('Guild avatar updated!');
      }
    } catch (err) {
      if (SETAVATAR_DEBUG) console.error('[setavatar] Set failed:', err);
      if (err?.name === 'AbortError') {
        await message.reply('Timed out fetching image (30s).');
      } else {
        await message
          .reply('Failed to set guild avatar. Check the URL and try again.')
          .catch(() => {});
      }
    }
  },
});

commands.set('bme', {
  description: "Display guild.members.me (bot's member) info in this server",
  async execute(message, client) {
    const guildId = message.guildId;
    if (!guildId) {
      await message.reply('Use this command in a server.');
      return;
    }
    const guild = client.guilds.get(guildId) ?? (await client.guilds.fetch(guildId));
    if (!guild) {
      await message.reply('Could not find this server.');
      return;
    }
    const me = guild.members.me ?? (await guild.members.fetchMe());
    const avatarUrl = me.displayAvatarURL({ size: 256 });
    const accentColor = me.accentColor ?? me.user.avatarColor ?? BRAND_COLOR;
    const roleNames = me.roles
      .filter((id) => id !== guild.id)
      .map((id) => guild.roles.get(id)?.name ?? id);
    const permNames = [];
    try {
      for (const [name, bit] of Object.entries(PermissionFlags)) {
        if (typeof bit === 'number' && me.permissions.has(bit)) permNames.push(name);
      }
    } catch {
      /* ignore import error */
    }

    const embed = new EmbedBuilder()
      .setTitle('guild.members.me')
      .setDescription("Bot's GuildMember in this server")
      .setColor(accentColor)
      .setThumbnail(avatarUrl)
      .addFields(
        { name: 'ID', value: `\`${me.id}\``, inline: true },
        { name: 'Username', value: me.user.username ?? '—', inline: true },
        { name: 'Display name', value: me.displayName ?? '—', inline: true },
        { name: 'Nickname', value: me.nick ?? '*(none)*', inline: true },
        { name: 'Joined', value: me.joinedAt.toISOString(), inline: true },
        {
          name: 'Roles',
          value: roleNames.length ? roleNames.slice(0, 15).join(', ') : '*(none)*',
          inline: false,
        },
        { name: 'Mute', value: String(me.mute), inline: true },
        { name: 'Deaf', value: String(me.deaf), inline: true },
        {
          name: 'Permissions (sample)',
          value: permNames.length ? permNames.slice(0, 12).join(', ') : '*(none)*',
          inline: false,
        },
      )
      .setFooter({ text: `Guild: ${guild.name}` })
      .setTimestamp();

    await message.reply({ embeds: [embed.toJSON()] });
  },
});

commands.set('attachurl', {
  description: 'Test file attachment by URL (sends image fetched from URL)',
  async execute(message) {
    const url = 'https://www.w3schools.com/html/pic_trulli.jpg';
    await message.reply({
      content: 'File attached from URL:',
      files: [{ name: 'trulli.jpg', url }],
    });
  },
});

/** Get human-readable badge names from user flags (checks common badges that fit in 32-bit). */
function getBadgeNames(flags) {
  if (flags == null || typeof flags !== 'number') return [];
  const badges = [];
  const DISPLAY_FLAGS = [
    ['Staff', UserFlagsBits.Staff],
    ['Partner', UserFlagsBits.Partner],
    ['Bug Hunter', UserFlagsBits.BugHunter],
    ['Ctp Member', UserFlagsBits.CtpMember],
    ['Friendly Bot', UserFlagsBits.FriendlyBot],
    ['Friendly Bot (Manual)', UserFlagsBits.FriendlyBotManualApproval],
  ];
  for (const [name, bit] of DISPLAY_FLAGS) {
    if ((flags & bit) === bit) badges.push(name);
  }
  return badges;
}

function addProfileFields(fields, profile, profileData, prefix = '') {
  if (!profile || typeof profile !== 'object') return;
  if (profile.pronouns != null && profile.pronouns !== '')
    fields.push({
      name: prefix + 'Pronouns',
      value: String(profile.pronouns).slice(0, 40),
      inline: true,
    });
  if (profile.bio != null && profile.bio !== '')
    fields.push({
      name: prefix + 'Bio',
      value: String(profile.bio).slice(0, 1024) || '—',
    });
  if (profile.banner != null && profile.banner !== '')
    fields.push({ name: prefix + 'Banner', value: 'Set', inline: true });
  const accent = profile.accent_color ?? profile.banner_color;
  if (accent != null)
    fields.push({
      name: prefix + 'Accent color',
      value: `#${Number(accent).toString(16).padStart(6, '0')}`,
      inline: true,
    });
  if (profile.theme != null)
    fields.push({ name: prefix + 'Theme', value: String(profile.theme), inline: true });
  const mutualCount = profileData?.mutual_guilds?.length ?? profileData?.mutual_guild_ids?.length;
  if (mutualCount != null && mutualCount > 0)
    fields.push({ name: prefix + 'Mutual servers', value: String(mutualCount), inline: true });
  const connected = profileData?.connected_accounts;
  if (connected?.length)
    fields.push({
      name: prefix + 'Connected accounts',
      value:
        connected
          .map((a) => a.name ?? a.type ?? '?')
          .slice(0, 5)
          .join(', ') + (connected.length > 5 ? ` (+${connected.length - 5})` : ''),
      inline: true,
    });
}

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
    let data;
    try {
      data = await client.users.fetchWithProfile(userId, {
        guildId: message.guildId ?? undefined,
      });
    } catch {
      await message.reply(
        'Could not fetch that user. They may not exist or the ID may be invalid.',
      );
      return;
    }
    const {
      user,
      userData,
      globalProfile: globalProfileData,
      serverProfile: serverProfileData,
      memberData,
    } = data;
    const globalProfileUserProfile = globalProfileData?.user_profile;
    const serverProfileUserProfile = serverProfileData?.user_profile;
    const bannerUrl =
      serverProfileUserProfile?.banner != null && serverProfileUserProfile.banner !== ''
        ? cdnBannerURL(userData.id, serverProfileUserProfile.banner, { size: 512 })
        : globalProfileUserProfile?.banner != null && globalProfileUserProfile.banner !== ''
          ? cdnBannerURL(userData.id, globalProfileUserProfile.banner, { size: 512 })
          : userData.banner != null && userData.banner !== ''
            ? cdnBannerURL(userData.id, userData.banner, { size: 512 })
            : null;
    const accentColor =
      serverProfileUserProfile &&
      (serverProfileUserProfile.accent_color ?? serverProfileUserProfile.banner_color) != null
        ? Number(serverProfileUserProfile.accent_color ?? serverProfileUserProfile.banner_color)
        : globalProfileUserProfile &&
            (globalProfileUserProfile.accent_color ?? globalProfileUserProfile.banner_color) != null
          ? Number(globalProfileUserProfile.accent_color ?? globalProfileUserProfile.banner_color)
          : userData.avatar_color != null
            ? Number(userData.avatar_color)
            : memberData?.accent_color != null
              ? Number(memberData.accent_color)
              : BRAND_COLOR;
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    const embed = new EmbedBuilder()
      .setTitle('User profile')
      .setColor(accentColor)
      .setThumbnail(avatarUrl);
    if (bannerUrl) embed.setImage(bannerUrl);

    const fields = [
      { name: 'Username', value: userData.username ?? '—', inline: true },
      {
        name: 'Display name',
        value: userData.global_name ?? userData.username ?? '—',
        inline: true,
      },
      { name: 'ID', value: `\`${userData.id}\``, inline: true },
      { name: 'Bot', value: userData.bot ? 'Yes' : 'No', inline: true },
      { name: 'System', value: userData.system ? 'Yes' : 'No', inline: true },
      { name: 'Discriminator', value: userData.discriminator ?? '0', inline: true },
      {
        name: 'Avatar',
        value: userData.avatar
          ? userData.avatar.startsWith('a_')
            ? 'Animated'
            : 'Set'
          : 'Default',
        inline: true,
      },
      {
        name: 'Avatar color',
        value:
          userData.avatar_color != null
            ? `#${Number(userData.avatar_color).toString(16).padStart(6, '0')}`
            : '—',
        inline: true,
      },
      {
        name: 'User banner',
        value: userData.banner != null && userData.banner !== '' ? 'Set' : '—',
        inline: true,
      },
    ];

    const flags = userData.flags ?? userData.public_flags;
    if (flags != null) {
      const badgeNames = getBadgeNames(flags);
      fields.push({
        name: 'Badges',
        value: badgeNames.length ? badgeNames.join(', ') : '—',
        inline: false,
      });
      fields.push({
        name: 'Flags (raw)',
        value: `\`${flags}\``,
        inline: true,
      });
    }

    if (globalProfileData) {
      fields.push({ name: '\u200B', value: '**Global Profile**', inline: false });
      addProfileFields(fields, globalProfileUserProfile, globalProfileData);
    }

    if (message.guildId && (serverProfileData || memberData)) {
      const guild = client.guilds.get(message.guildId);
      const guildName = guild?.name ?? 'this server';
      fields.push({
        name: '\u200B',
        value: `**Server Profile** (${guildName})`,
        inline: false,
      });
      if (serverProfileUserProfile && typeof serverProfileUserProfile === 'object') {
        addProfileFields(fields, serverProfileUserProfile, serverProfileData, 'Server ');
      }
      if (memberData) {
        const nick = memberData.nick ?? null;
        if (nick)
          fields.push({
            name: 'Nickname',
            value: String(nick).slice(0, 32),
            inline: true,
          });
        if (memberData.joined_at)
          fields.push({
            name: 'Joined',
            value: `<t:${Math.floor(new Date(memberData.joined_at).getTime() / 1000)}:R>`,
            inline: true,
          });
        if (memberData.premium_since)
          fields.push({
            name: 'Boosting since',
            value: `<t:${Math.floor(new Date(memberData.premium_since).getTime() / 1000)}:R>`,
            inline: true,
          });
        if (memberData.communication_disabled_until) {
          const until = new Date(memberData.communication_disabled_until);
          if (until > new Date())
            fields.push({
              name: 'Timeout until',
              value: `<t:${Math.floor(until.getTime() / 1000)}:F>`,
              inline: true,
            });
        }
        if (memberData.roles?.length) {
          const roleIds = memberData.roles.filter((id) => id !== message.guildId);
          const roleNames = guild
            ? roleIds.map((id) => guild.roles.get(id)?.name ?? id).slice(0, 20)
            : roleIds.slice(0, 20);
          const display =
            roleNames.length > 0
              ? roleNames.join(', ') +
                (roleIds.length > 20 ? ` (+${roleIds.length - 20} more)` : '')
              : '—';
          fields.push({ name: 'Roles', value: display.slice(0, 1024) || '—' });
        }
        if (memberData.avatar != null && memberData.avatar !== '')
          fields.push({ name: 'Server avatar', value: 'Set', inline: true });
        if (memberData.banner != null && memberData.banner !== '')
          fields.push({ name: 'Server banner', value: 'Set', inline: true });
        if (memberData.mute !== undefined)
          fields.push({ name: 'Muted', value: memberData.mute ? 'Yes' : 'No', inline: true });
        if (memberData.deaf !== undefined)
          fields.push({ name: 'Deafened', value: memberData.deaf ? 'Yes' : 'No', inline: true });
      }
    }

    embed
      .addFields(...fields)
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setTimestamp();
    try {
      await message.reply({ embeds: [embed.toJSON()] });
    } catch (err) {
      const fallback = `**${userData.username ?? userData.global_name ?? 'User'}** (ID: \`${userData.id}\`) — Could not send full embed (${err?.statusCode === 502 ? 'server error' : 'error'}). Try again.`;
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
  description:
    'Stream video in your VC (default 720p; !playvideo [url] [480p|720p|1080p|1440p|4k])',
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
    const firstArg = args[0]?.trim();
    const secondArg = args[1]?.trim();
    const RESOLUTIONS = ['480p', '720p', '1080p', '1440p', '4k'];
    const resolutionPreset = (s) => s && RESOLUTIONS.includes(s.toLowerCase());
    let inputUrl;
    let resolution;
    if (resolutionPreset(firstArg)) {
      inputUrl = DEFAULT_VIDEO_URL;
      resolution = firstArg.toLowerCase();
    } else if (firstArg && (firstArg.startsWith('http://') || firstArg.startsWith('https://'))) {
      inputUrl = firstArg;
      resolution = resolutionPreset(secondArg) ? secondArg.toLowerCase() : '720p';
    } else {
      inputUrl = DEFAULT_VIDEO_URL;
      resolution = resolutionPreset(secondArg) ? secondArg.toLowerCase() : '720p';
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
      await connection.playVideo(videoUrl, {
        source: 'screenshare',
        resolution,
      });
      const fps = 30;
      await message.reply(
        `Streaming video in your voice channel at ${resolution} ${fps}fps. Use \`${PREFIX}stop\` to leave.`,
      );
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
