import type {
  APIBan,
  APIEmoji,
  APISticker,
  GatewayGuildAuditLogEntryCreateDispatchData,
  GatewayGuildBanAddDispatchData,
  GatewayGuildBanRemoveDispatchData,
  GatewayGuildRoleCreateDispatchData,
  GatewayGuildRoleDeleteDispatchData,
  GatewayGuildRoleUpdateBulkDispatchData,
  GatewayGuildRoleUpdateDispatchData,
  GatewayGuildStickersUpdateDispatchData,
} from '@fluxerjs/types';
import { syncEmojis, syncStickers } from '../../Domain/Guild/Cache.js';
import { GuildBan } from '../../Domain/Guild/GuildBan.js';
import { Role } from '../../Domain/Guild/Role.js';
import { Events } from '../../Helpers/Events.js';
import type { AuditLogEntryPayload, GuildStickersUpdatePayload } from '../EventPayloads.js';
import type { HandlerMap } from './Types.js';

function toAuditLogEntry(data: GatewayGuildAuditLogEntryCreateDispatchData): AuditLogEntryPayload {
  return {
    id: data.id,
    actionType: data.action_type,
    userId: data.user_id ?? null,
    targetId: data.target_id ?? null,
    reason: data.reason ?? null,
    options: data.options ?? null,
    changes: (data.changes ?? []).map((c) => ({
      key: c.key,
      oldValue: c.old_value,
      newValue: c.new_value,
    })),
    guildId: data.guild_id ?? null,
  };
}

export const guildResourceHandlers: HandlerMap = {
  GUILD_EMOJIS_UPDATE(client, d) {
    const data = d as {
      guild_id: string;
      emojis: APIEmoji[];
    };

    const guild = client.guilds.get(data.guild_id);
    if (guild) {
      syncEmojis(guild, data.emojis ?? []);
    }

    client.emit(Events.GuildEmojisUpdate, {
      guildId: data.guild_id,
      emojis: guild ? [...guild.emojis.values()] : [],
    });
  },

  GUILD_STICKERS_UPDATE(client, d) {
    const data = d as GatewayGuildStickersUpdateDispatchData;
    const guild = client.guilds.get(data.guild_id);
    if (guild) {
      syncStickers(guild, (data.stickers ?? []) as APISticker[]);
    }

    const payload: GuildStickersUpdatePayload = {
      guildId: data.guild_id,
      stickers: guild ? [...guild.stickers.values()] : [],
    };
    client.emit(Events.GuildStickersUpdate, payload);
  },

  GUILD_ROLE_CREATE(client, d) {
    const data = d as GatewayGuildRoleCreateDispatchData;
    const guild = client.guilds.get(data.guild_id);
    const role = new Role(client, data.role, data.guild_id);
    if (guild) guild.roles.set(role.id, role);
    client.emit(Events.GuildRoleCreate, role);
  },

  GUILD_ROLE_UPDATE(client, d) {
    const data = d as GatewayGuildRoleUpdateDispatchData;
    const guild = client.guilds.get(data.guild_id);
    let role = guild?.roles.get(data.role.id);
    const oldRole = role ? role._clone() : null;
    if (role) role._patch(data.role);
    else {
      role = new Role(client, data.role, data.guild_id);
      guild?.roles.set(role.id, role);
    }
    client.emit(Events.GuildRoleUpdate, oldRole, role);
  },

  GUILD_ROLE_UPDATE_BULK(client, d) {
    const data = d as GatewayGuildRoleUpdateBulkDispatchData;
    for (const roleData of data.roles ?? []) {
      guildResourceHandlers.GUILD_ROLE_UPDATE!(client, {
        guild_id: data.guild_id,
        role: roleData,
      });
    }
  },

  GUILD_ROLE_DELETE(client, d) {
    const data = d as GatewayGuildRoleDeleteDispatchData;
    const guild = client.guilds.get(data.guild_id);
    const role = guild?.roles.get(data.role_id) ?? null;
    guild?.roles.delete(data.role_id);
    client.emit(Events.GuildRoleDelete, role, data.guild_id, data.role_id);
  },

  GUILD_BAN_ADD(client, d) {
    const data = d as GatewayGuildBanAddDispatchData;
    const banData: APIBan & { guild_id?: string } = {
      user: data.user,
      reason: data.reason ?? null,
      guild_id: data.guild_id,
    };
    client.emit(Events.GuildBanAdd, new GuildBan(client, banData, data.guild_id));
  },

  GUILD_BAN_REMOVE(client, d) {
    const data = d as GatewayGuildBanRemoveDispatchData;
    client.emit(
      Events.GuildBanRemove,
      new GuildBan(client, { user: data.user, reason: null }, data.guild_id),
    );
  },

  GUILD_AUDIT_LOG_ENTRY_CREATE(client, d) {
    client.emit(
      Events.GuildAuditLogEntryCreate,
      toAuditLogEntry(d as GatewayGuildAuditLogEntryCreateDispatchData),
    );
  },
};
