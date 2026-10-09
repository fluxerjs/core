import type {
  APIChannel,
  APIEmoji,
  APIGuildMember,
  APIRole,
  APISticker,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import { Events } from '../../Helpers/Events.js';
import {
  mergeMembers,
  syncChannels,
  syncEmojis,
  syncRoles,
  syncStickers,
  syncThreads,
} from './Cache.js';
import { Guild } from './Guild.js';
import { type GatewayGuildPayload, normalizeGuildSnapshotPayload } from './Payload.js';
import type { GuildData } from './Types.js';

/** Nested resources optionally present on READY / GUILD_CREATE snapshots. */
export interface GuildSnapshotResources {
  roles?: APIRole[];
  channels?: APIChannel[];
  members?: Array<APIGuildMember & { user?: { id: string } }>;
  emojis?: APIEmoji[];
  stickers?: APISticker[];
  /** Active threads. An empty array replaces the guild's cached threads. */
  threads?: APIChannel[];
}

export type GatewayGuildSnapshotPayload = GatewayGuildPayload & {
  unavailable?: boolean;
  channels?: APIChannel[];
  voice_states?: GatewayVoiceStateUpdateDispatchData[];
  members?: Array<APIGuildMember & { user?: { id: string } }>;
  roles?: APIRole[];
  emojis?: APIEmoji[];
  stickers?: APISticker[];
  threads?: APIChannel[];
};

export interface UpsertGuildResult {
  guild: Guild;
  /** True when a new Guild instance was created. */
  created: boolean;
  /** True when an existing unavailable guild became available again. */
  recovered: boolean;
}

/**
 * Identity-preserving guild upsert from a READY / GUILD_CREATE snapshot.
 *
 * Reuses the cached Guild (and nested Role/Channel/Emoji/Sticker instances) when present,
 * patches metadata, and syncs nested caches with prune (members are merge-only).
 */
export function upsertGuildFromSnapshot(
  client: Client,
  guildData: GuildData,
  resources: GuildSnapshotResources = {},
): UpsertGuildResult {
  const existing = client.guilds.get(guildData.id);
  const recovered = existing?.available === false;
  let created = false;
  let guild: Guild;

  if (existing) {
    guild = existing;
    // `_patch` leaves count fields alone when the snapshot omits them.
    guild._patch(guildData);
  } else {
    guild = new Guild(client, guildData);
    created = true;
  }

  // Register before syncing nested resources so putChannel can resolve the guild.
  client.guilds.set(guild.id, guild);

  if (resources.roles !== undefined) syncRoles(guild, resources.roles);
  if (resources.channels !== undefined) syncChannels(guild, resources.channels);
  if (resources.threads !== undefined) {
    syncThreads(
      guild,
      resources.threads,
      new Set((resources.channels ?? []).map((channel) => channel.id)),
    );
  }
  if (resources.members !== undefined) mergeMembers(guild, resources.members);
  if (resources.emojis !== undefined) syncEmojis(guild, resources.emojis);
  if (resources.stickers !== undefined) syncStickers(guild, resources.stickers);

  return { guild, created, recovered };
}

/**
 * Normalize a READY / GUILD_CREATE wire payload, upsert the guild, and emit voice state sync.
 * Returns null when the payload is not a valid guild snapshot.
 */
export function applyGuildSnapshotFromGateway(
  client: Client,
  raw: unknown,
): UpsertGuildResult | null {
  const guildData = normalizeGuildSnapshotPayload(raw);
  if (!guildData) return null;

  const g = raw as GatewayGuildSnapshotPayload;
  const result = upsertGuildFromSnapshot(client, guildData, {
    roles: g.roles,
    channels: g.channels,
    members: g.members,
    emojis: g.emojis,
    stickers: g.stickers,
    // A channel list without `threads` means this session has no viewable threads.
    threads: g.channels !== undefined ? (g.threads ?? []) : g.threads,
  });

  if (g.voice_states?.length) {
    client.emit(Events.VoiceStatesSync, {
      guildId: result.guild.id,
      voiceStates: g.voice_states,
    });
  }

  return result;
}
