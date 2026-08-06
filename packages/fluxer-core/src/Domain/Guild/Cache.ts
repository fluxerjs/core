import type { APIChannel, APIEmoji, APIGuildMember, APIRole, APISticker } from '@fluxerjs/types';
import { ChannelType } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import type { GuildChannel } from '../Channel/index.js';
import { Channel } from '../Channel/index.js';
import type { Guild } from './Guild.js';
import { GuildEmoji } from './GuildEmoji.js';
import { GuildMember } from './GuildMember.js';
import { GuildSticker } from './GuildSticker.js';
import { Role } from './Role.js';

const DM_CHANNEL_TYPES = new Set<ChannelType>([
  ChannelType.DM,
  ChannelType.GroupDM,
  ChannelType.DMPersonalNotes,
]);

/**
 * Place an existing Channel instance into the global + guild indexes.
 * Used by CHANNEL_* handlers after create/patch.
 */
export function putChannel(client: Client, channel: Channel, guild?: Guild | null): void {
  client.channels.set(channel.id, channel);
  const resolvedGuild =
    guild ??
    (() => {
      const guildId = 'guildId' in channel ? (channel as GuildChannel).guildId : undefined;
      return guildId ? client.guilds.get(guildId) : undefined;
    })();
  if (resolvedGuild) {
    resolvedGuild.channels.set(channel.id, channel as GuildChannel);
  }
}

/**
 * Identity-preserving channel upsert into both indexes.
 * Same type → `_patch`; type change → replace instance; missing type → create.
 */
export function cacheChannel(guild: Guild, data: APIChannel): GuildChannel | null {
  const existing = guild.channels.get(data.id) ?? guild.client.channels.get(data.id);

  if (existing && 'guildId' in existing && existing.type === data.type) {
    existing._patch(data);
    putChannel(guild.client, existing, guild);
    return existing as GuildChannel;
  }

  const channel = Channel.from(guild.client, data);
  if (!channel) return null;
  putChannel(guild.client, channel, guild);
  return channel as GuildChannel;
}

export function cacheMember(
  guild: Guild,
  data: APIGuildMember & { user: { id: string } },
): GuildMember {
  const existing = guild.members.get(data.user.id);
  if (existing) {
    existing._patch(data);
    return existing;
  }
  const member = new GuildMember(guild.client, { ...data, guild_id: guild.id }, guild);
  guild.members.set(member.id, member);
  return member;
}

export function cacheRole(guild: Guild, data: APIRole): Role {
  const existing = guild.roles.get(data.id);
  if (existing) {
    existing._patch(data);
    return existing;
  }
  const role = new Role(guild.client, data, guild.id);
  guild.roles.set(role.id, role);
  return role;
}

/** Cache roles from a bulk REST response; returns structure instances. */
export function replaceRoles(guild: Guild, data: APIRole[]): Role[] {
  return data.map((r) => cacheRole(guild, r));
}

/**
 * Identity-preserving emoji upsert.
 * Mutable fields are patched; immutable changes (`animated`) replace the instance.
 */
export function cacheEmoji(guild: Guild, data: APIEmoji): GuildEmoji {
  const existing = guild.emojis.get(data.id);
  if (existing) {
    const animated = data.animated ?? false;
    if (existing.animated !== animated) {
      const replaced = new GuildEmoji(guild.client, { ...data, guild_id: guild.id }, guild.id);
      guild.emojis.set(replaced.id, replaced);
      return replaced;
    }
    existing._patch(data);
    return existing;
  }
  const emoji = new GuildEmoji(guild.client, { ...data, guild_id: guild.id }, guild.id);
  guild.emojis.set(emoji.id, emoji);
  return emoji;
}

/**
 * Identity-preserving sticker upsert.
 * Mutable fields are patched; immutable changes (`animated`) replace the instance.
 */
export function cacheSticker(guild: Guild, data: APISticker): GuildSticker {
  const existing = guild.stickers.get(data.id);
  if (existing) {
    const animated = data.animated ?? false;
    if (existing.animated !== animated) {
      const replaced = new GuildSticker(guild.client, { ...data, guild_id: guild.id }, guild.id);
      guild.stickers.set(replaced.id, replaced);
      return replaced;
    }
    existing._patch(data);
    return existing;
  }
  const sticker = new GuildSticker(guild.client, { ...data, guild_id: guild.id }, guild.id);
  guild.stickers.set(sticker.id, sticker);
  return sticker;
}

/** Sync roles from a snapshot: upsert present IDs, prune absent ones. */
export function syncRoles(guild: Guild, roles: APIRole[]): void {
  const keep = new Set(roles.map((r) => r.id));
  for (const role of roles) cacheRole(guild, role);
  for (const id of [...guild.roles.keys()]) {
    if (!keep.has(id)) guild.roles.delete(id);
  }
}

/**
 * Sync channels from a snapshot: identity-preserving upsert, prune absent
 * (removes from both indexes + clears message caches).
 */
export function syncChannels(guild: Guild, channels: APIChannel[]): void {
  const accepted = channels
    .filter(
      (channel) =>
        !DM_CHANNEL_TYPES.has(channel.type) &&
        (channel.guild_id == null || channel.guild_id === guild.id),
    )
    .map((channel) => ({ ...channel, guild_id: guild.id }));
  const keep = new Set(accepted.map((channel) => channel.id));
  for (const data of accepted) cacheChannel(guild, data);
  for (const [id, channel] of [...guild.channels.entries()]) {
    if (keep.has(id)) continue;
    Map.prototype.delete.call(guild.channels, id);
    guild.client.cache.cascadeChannel(channel, 'guild');
  }
}

/** Merge members from a snapshot. Never prunes (partial lists are common). */
export function mergeMembers(
  guild: Guild,
  members: Array<APIGuildMember & { user?: { id: string } }>,
): void {
  for (const m of members) {
    if (!m.user?.id) continue;
    cacheMember(guild, m as APIGuildMember & { user: { id: string } });
  }
}

/** Sync emojis from a snapshot: upsert + prune absent. */
export function syncEmojis(guild: Guild, emojis: APIEmoji[]): void {
  const keep = new Set(emojis.map((e) => e.id));
  for (const e of emojis) {
    if (!e.id || e.name == null) continue;
    cacheEmoji(guild, e);
  }
  for (const id of [...guild.emojis.keys()]) {
    if (!keep.has(id)) guild.emojis.delete(id);
  }
}

/** Sync stickers from a snapshot: upsert + prune absent. */
export function syncStickers(guild: Guild, stickers: APISticker[]): void {
  const keep = new Set(stickers.map((s) => s.id));
  for (const s of stickers) cacheSticker(guild, s);
  for (const id of [...guild.stickers.keys()]) {
    if (!keep.has(id)) guild.stickers.delete(id);
  }
}
