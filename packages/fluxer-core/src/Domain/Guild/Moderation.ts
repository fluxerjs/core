import type { APIBan } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { toGuildBanBody } from '../../ClientCore/SdkOptions/Guild.js';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import type { Guild } from './Guild.js';
import { GuildBan } from './GuildBan.js';
import type { GuildBanOptions } from './Types.js';

export async function ban(guild: Guild, userId: string, options?: GuildBanOptions): Promise<void> {
  const body = options ? toGuildBanBody(options) : {};
  await guild.client.rest.put(Routes.guildBan(guild.id, userId), {
    body: Object.keys(body).length ? body : undefined,
    auth: true,
    ...auditReasonHeaders(options?.reason),
  });
}

export async function fetchBans(guild: Guild): Promise<GuildBan[]> {
  const data = await guild.client.rest.get<APIBan[]>(Routes.guildBans(guild.id));
  return data.map((b) => new GuildBan(guild.client, { ...b, guild_id: guild.id }, guild.id));
}

export async function unban(guild: Guild, userId: string, reason?: string): Promise<void> {
  await guild.client.rest.delete(Routes.guildBan(guild.id, userId), {
    auth: true,
    ...auditReasonHeaders(reason),
  });
}

export async function kick(guild: Guild, userId: string, reason?: string): Promise<void> {
  await guild.client.rest.delete(Routes.guildMember(guild.id, userId), {
    auth: true,
    ...auditReasonHeaders(reason),
  });
}
