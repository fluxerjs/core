/**
 * Voice bot — join a VC and play WebM/Opus audio or MP4 video.
 *
 * WARNING: Voice is being reworked. Fluxer is updating how voice works, so
 * @fluxerjs/voice and this demo will change soon. Do not build production bots
 * on the current voice APIs.
 *
 * Commands:
 *   !play — joins your VC and plays a fixed WebM/Opus track (via youtube-dl-exec)
 *   !playvideo [url] [480p|720p|1080p|1440p|4k] — stream MP4 (default 720p)
 *   !stop — stop playback and leave
 *
 * Usage (from repo root after pnpm install && pnpm run build):
 *   FLUXER_BOT_TOKEN=your_token node examples/voice-bot.js
 *
 * Optional: VOICE_DEBUG=1, FLUXER_VIDEO_FFMPEG=1
 *
 * See the Voice guide: https://fluxer.js.org/guides/voice/
 */

import { Client, Events, parsePrefixCommand, VoiceChannel } from '@fluxerjs/core';
import { getVoiceManager, LiveKitRtcConnection } from '@fluxerjs/voice';
import youtubedl from 'youtube-dl-exec';

console.warn(
  '[voice] WARNING: Voice is being reworked. Fluxer is updating how voice works; @fluxerjs/voice and this example will change soon.',
);

const PREFIX = '!';
const PLAY_URL = 'https://www.youtube.com/watch?v=eVTXPUF4Oz4';
const YTDLP_FORMAT = 'bestaudio[ext=webm][acodec=opus]/bestaudio[ext=webm]/bestaudio';
const DEFAULT_VIDEO_URL = 'https://www.w3schools.com/html/mov_bbb.mp4';
const YTDLP_VIDEO_FORMAT =
  'best[height<=1080][ext=mp4]/best[height<=1080]/22/18/best[ext=mp4]/best';
const YOUTUBE_LIKE = /youtube\.com|youtu\.be|yt\.be/i;
const RESOLUTIONS = ['480p', '720p', '1080p', '1440p', '4k'];

/** @type {Map<string, { channel: import('@fluxerjs/core').VoiceChannel, streamUrl: string }>} */
const playState = new Map();

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

async function resolveVoiceChannel(message, client) {
  const guildId = message.guildId;
  if (!guildId) {
    await message.reply('This command only works in a server.');
    return null;
  }
  const voiceManager = getVoiceManager(client);
  const voiceChannelId = voiceManager.getVoiceChannelId(guildId, message.author.id);
  if (!voiceChannelId) {
    await message.reply('Join a voice channel first.');
    return null;
  }
  const channel = client.channels.get(voiceChannelId);
  if (!(channel instanceof VoiceChannel)) {
    await message.reply('Could not find that voice channel.');
    return null;
  }
  return { guildId, voiceManager, channel };
}

const token = process.env.FLUXER_BOT_TOKEN;
if (!token) {
  console.error('Error: Set FLUXER_BOT_TOKEN environment variable');
  process.exit(1);
}

const client = new Client({
  rest: process.env.FLUXER_API_URL ? { api: process.env.FLUXER_API_URL } : undefined,
});

// Create VoiceManager before login so it receives VoiceStatesSync from READY/GUILD_CREATE.
getVoiceManager(client);

client.on(Events.Ready, () => {
  console.log(`Logged in as ${client.user?.username}`);
  client.user?.setPresence({
    status: 'online',
    customStatus: { text: 'Try !play' },
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content) return;
  const parsed = parsePrefixCommand(message.content, PREFIX);
  if (!parsed) return;

  const { command, args } = parsed;

  try {
    if (command === 'play') {
      const ctx = await resolveVoiceChannel(message, client);
      if (!ctx) return;
      const { guildId, voiceManager, channel } = ctx;
      const streamUrl = await getStreamUrl(PLAY_URL);
      if (!streamUrl) {
        await message.reply('Could not get stream URL. Is youtube-dl-exec installed?');
        return;
      }
      playState.set(guildId, { channel, streamUrl });
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
      return;
    }

    if (command === 'playvideo') {
      const ctx = await resolveVoiceChannel(message, client);
      if (!ctx) return;
      const { voiceManager, channel } = ctx;

      const first = args[0]?.trim();
      const second = args[1]?.trim();
      const isRes = (s) => s && RESOLUTIONS.includes(s.toLowerCase());

      let inputUrl;
      let resolution;
      if (isRes(first)) {
        inputUrl = DEFAULT_VIDEO_URL;
        resolution = first.toLowerCase();
      } else if (first && /^https?:\/\//i.test(first)) {
        inputUrl = first;
        resolution = isRes(second) ? second.toLowerCase() : '720p';
      } else {
        inputUrl = DEFAULT_VIDEO_URL;
        resolution = isRes(second) ? second.toLowerCase() : '720p';
      }

      let videoUrl = inputUrl;
      if (YOUTUBE_LIKE.test(inputUrl)) {
        await message.reply('Fetching video URL from YouTube...').catch(() => {});
        const resolved = await getVideoUrl(inputUrl);
        if (!resolved) {
          await message.reply('Could not get video URL. Is youtube-dl-exec installed?');
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
      await connection.playVideo(videoUrl, { source: 'screenshare', resolution });
      await message.reply(
        `Streaming video at ${resolution} 30fps. Use \`${PREFIX}stop\` to leave.`,
      );
      return;
    }

    if (command === 'stop') {
      const guildId = message.guildId;
      if (!guildId) {
        await message.reply('This command only works in a server.');
        return;
      }
      const voiceManager = getVoiceManager(client);
      const connection = voiceManager.getConnection(guildId);
      if (connection) {
        playState.delete(guildId);
        connection.stop();
        voiceManager.leave(guildId);
        await message.reply('Stopped and left the voice channel.');
      } else {
        await message.reply('Not in a voice channel in this server.');
      }
    }
  } catch (err) {
    console.error('Voice command error:', err);
    await message.reply('Failed to run that voice command.').catch(() => {});
  }
});

client.on(Events.Error, (err) => console.error('Client error:', err));

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

try {
  await client.login(token);
} catch (err) {
  console.error('Login failed:', err);
  process.exit(1);
}
