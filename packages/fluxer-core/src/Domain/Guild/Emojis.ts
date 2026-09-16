import type { APIEmoji, APIGuildEmojiBulkCreateResponse } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import { rethrowMapped } from '../../Helpers/HttpErrors.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { cacheEmoji } from './Cache.js';
import type { Guild } from './Guild.js';
import type { GuildEmoji } from './GuildEmoji.js';

export async function fetchEmojis(guild: Guild): Promise<GuildEmoji[]> {
  const data = await guild.client.rest.get<APIEmoji[]>(Routes.guildEmojis(guild.id));
  return data.map((e) => cacheEmoji(guild, e));
}

export async function fetchEmoji(guild: Guild, emojiId: string): Promise<GuildEmoji> {
  try {
    const data = await guild.client.rest.get<APIEmoji>(Routes.guildEmoji(guild.id, emojiId));
    return cacheEmoji(guild, data);
  } catch (err) {
    rethrowMapped(err, {
      notFound: { code: ErrorCodes.EmojiNotFound, message: `Emoji ${emojiId} not found in guild` },
      fallback: 'Failed to fetch guild emoji',
    });
  }
}

export async function createEmoji(
  guild: Guild,
  options: { name: string; image: string; reason?: string },
): Promise<GuildEmoji> {
  const { reason, ...body } = options;
  const data = await guild.client.rest.post<APIEmoji>(Routes.guildEmojis(guild.id), {
    body,
    auth: true,
    ...auditReasonHeaders(reason),
  });
  return cacheEmoji(guild, data);
}

export async function cloneEmoji(guild: Guild, sourceEmojiId: string): Promise<GuildEmoji> {
  const data = await guild.client.rest.post<APIEmoji>(Routes.guildEmojisClone(guild.id), {
    body: { source_emoji_id: sourceEmojiId },
    auth: true,
  });
  return cacheEmoji(guild, data);
}

export async function createEmojisBulk(
  guild: Guild,
  emojis: Array<{ name: string; image: string }>,
): Promise<{ success: GuildEmoji[]; failed: Array<{ name: string; error: string }> }> {
  const data = await guild.client.rest.post<APIGuildEmojiBulkCreateResponse>(
    Routes.guildEmojisBulk(guild.id),
    { body: { emojis }, auth: true },
  );
  return { success: data.success.map((e) => cacheEmoji(guild, e)), failed: data.failed };
}
