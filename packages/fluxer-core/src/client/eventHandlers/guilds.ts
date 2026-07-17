import type {
  APIChannel,
  APIGuildMember,
  APIRole,
  GatewayGuildDeleteDispatchData,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import { Channel, type GuildChannel } from '../../structures/Channel.js';
import { Guild } from '../../structures/Guild.js';
import { Role } from '../../structures/Role.js';
import { Events } from '../../util/Events.js';
import {
  type GatewayGuildPayload,
  normalizeGuildSnapshotPayload,
  normalizeGuildUpdatePayload,
} from '../../util/guildUtils.js';
import type { Client } from '../Client.js';
import { cacheMember } from './helpers.js';
import type { HandlerMap } from './types.js';

type GuildCreatePayload = GatewayGuildPayload & {
  unavailable?: boolean;
  channels?: APIChannel[];
  voice_states?: GatewayVoiceStateUpdateDispatchData[];
  members?: Array<APIGuildMember & { user: { id: string } }>;
  roles?: APIRole[];
};

function markGuildUnavailable(client: Client, id: string): void {
  const guild = client.guilds.get(id);
  if (!guild || guild.available === false) return;
  guild.available = false;
  client.emit(Events.GuildUnavailable, guild);
}

function refreshRecoveredGuild(guild: Guild, data: GuildCreatePayload): void {
  if (data.roles !== undefined) {
    guild.roles.clear();
    for (const role of data.roles) {
      guild.roles.set(role.id, new Role(guild.client, role, guild.id));
    }
  }

  if (data.channels !== undefined) {
    const recoveredChannelIds = new Set(data.channels.map((channel) => channel.id));
    for (const channel of guild.channels.values()) {
      guild.client.channels.delete(channel.id);
      if (!recoveredChannelIds.has(channel.id)) guild.client._clearMessageCache(channel.id);
    }
    guild.channels.clear();
  }
}

export const guildHandlers: HandlerMap = {
  GUILD_CREATE(client, d) {
    const raw = d as { id?: unknown; unavailable?: unknown };
    if (raw.unavailable === true) {
      if (typeof raw.id === 'string') {
        try {
          markGuildUnavailable(client, raw.id);
        } finally {
          client._onGuildReceived(raw.id);
        }
      }
      return;
    }

    const guildData = normalizeGuildSnapshotPayload(d as unknown);
    if (!guildData) return;

    const g = d as GuildCreatePayload;
    const existing = client.guilds.get(guildData.id);
    const recovered = existing?.available === false;
    const guild = recovered && existing ? existing : new Guild(client, guildData);

    if (recovered) {
      guild._patch(guildData);
      refreshRecoveredGuild(guild, g);
    }
    client.guilds.set(guild.id, guild);

    for (const ch of g.channels ?? []) {
      const channel = Channel.from(client, ch);
      if (channel) {
        client.channels.set(channel.id, channel);
        guild.channels.set(channel.id, channel as GuildChannel);
      }
    }
    // GUILD_CREATE member lists may be partial, so merge supplied members into the retained cache.
    for (const m of g.members ?? []) cacheMember(client, guild, m);

    if (recovered) guild.available = true;
    client.emit(recovered ? Events.GuildAvailable : Events.GuildCreate, guild);
    if (g.voice_states?.length) {
      client.emit(Events.VoiceStatesSync, { guildId: guild.id, voiceStates: g.voice_states });
    }
    client._onGuildReceived(guild.id);
  },

  GUILD_UPDATE(client, d) {
    const guildData = normalizeGuildUpdatePayload(d as unknown);
    if (!guildData) return;

    const existing = client.guilds.get(guildData.id);
    if (existing) {
      const oldSnapshot = Object.assign(Object.create(Object.getPrototypeOf(existing)), existing);
      existing._patch(guildData);
      client.emit(Events.GuildUpdate, oldSnapshot, existing);
      return;
    }

    const updated = new Guild(client, guildData);
    client.guilds.set(updated.id, updated);
    client.emit(Events.GuildUpdate, updated, updated);
  },

  GUILD_DELETE(client, d) {
    const { id, unavailable } = d as GatewayGuildDeleteDispatchData;
    try {
      if (unavailable === true) {
        markGuildUnavailable(client, id);
        return;
      }

      const guild = client.guilds.get(id);
      if (!guild) return;
      client.guilds.delete(id);
      client.emit(Events.GuildDelete, guild);
    } finally {
      client._onGuildReceived(id);
    }
  },
};
