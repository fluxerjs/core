import type {
  GatewayGuildCountsUpdateDispatchData,
  GatewayGuildDeleteDispatchData,
} from '@fluxerjs/types';
import { Guild } from '../../Domain/Guild/Guild.js';
import { normalizeGuildUpdatePayload } from '../../Domain/Guild/Payload.js';
import { applyGuildSnapshotFromGateway } from '../../Domain/Guild/Snapshot.js';
import { Events } from '../../Helpers/Events.js';
import type { Client } from '../Client.js';
import type { GuildCountsUpdatePayload } from '../EventPayloads.js';
import type { HandlerMap } from './Types.js';

function markGuildUnavailable(client: Client, id: string): void {
  const guild = client.guilds.get(id);
  if (!guild || guild.available === false) return;
  guild.available = false;
  client.emit(Events.GuildUnavailable, guild);
}

export const guildHandlers: HandlerMap = {
  GUILD_CREATE(client, d) {
    const raw = d as { id?: unknown; unavailable?: unknown };
    if (raw.unavailable === true) {
      if (typeof raw.id === 'string' && raw.id.length > 0) {
        try {
          markGuildUnavailable(client, raw.id);
        } finally {
          client._onGuildReceived(raw.id);
        }
      }
      return;
    }

    const result = applyGuildSnapshotFromGateway(client, d);
    if (!result) return;

    const { guild, recovered } = result;
    if (recovered) guild.available = true;
    client.emit(recovered ? Events.GuildAvailable : Events.GuildCreate, guild);
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

  GUILD_COUNTS_UPDATE(client, d) {
    const data = d as GatewayGuildCountsUpdateDispatchData;
    const counts = (data.counts ?? []).map((c) => ({
      guildId: c.guild_id,
      memberCount: c.member_count,
      onlineCount: c.online_count,
    }));

    for (const count of counts) {
      const guild = client.guilds.get(count.guildId);
      if (!guild) continue;
      if (typeof count.memberCount === 'number') guild.memberCount = count.memberCount;
      if (typeof count.onlineCount === 'number') guild.onlineCount = count.onlineCount;
    }

    client.emit(Events.GuildCountsUpdate, { counts } satisfies GuildCountsUpdatePayload);
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
