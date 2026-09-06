import type { APIRole } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { parseRoleMention } from '@fluxerjs/util';
import { toRoleCreateBody } from '../../ClientCore/SdkOptions/Guild.js';
import { rethrowMapped } from '../../Helpers/HttpErrors.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { cacheRole, replaceRoles } from './Cache.js';
import type { Guild } from './Guild.js';
import type { Role } from './Role.js';
import type { RoleCreateOptions } from './RoleOptions.js';

/**
 * Create a role in the guild.
 * @param guild - Target guild
 * @param options - CamelCase create options
 */
export async function createRole(guild: Guild, options: RoleCreateOptions = {}): Promise<Role> {
  const body = toRoleCreateBody(options);
  const data = await guild.client.rest.post<APIRole>(Routes.guildRoles(guild.id), {
    body: Object.keys(body).length ? body : undefined,
    auth: true,
  });
  return cacheRole(guild, data);
}

/** Fetch all roles and refresh the guild role cache. */
export async function fetchRoles(guild: Guild): Promise<Role[]> {
  const data = await guild.client.rest.get<APIRole[]>(Routes.guildRoles(guild.id));
  return data.map((r) => cacheRole(guild, r));
}

/** Fetch a single role by ID. */
export async function fetchRole(guild: Guild, roleId: string): Promise<Role> {
  try {
    const data = await guild.client.rest.get<APIRole>(Routes.guildRole(guild.id, roleId));
    return cacheRole(guild, data);
  } catch (err) {
    rethrowMapped(err, {
      notFound: { code: ErrorCodes.RoleNotFound, message: `Role ${roleId} not found in guild` },
      fallback: 'Failed to fetch guild role',
    });
  }
}

/** Resolve a role mention, snowflake, or name to a role ID. */
export async function resolveRoleId(guild: Guild, arg: string): Promise<string | null> {
  const parsed = parseRoleMention(arg);
  if (parsed) return parsed;
  const trimmed = arg.trim();
  if (/^\d{17,19}$/.test(trimmed)) return trimmed;
  const needle = trimmed.toLowerCase();
  const cached = guild.roles.find((r) => r.name?.toLowerCase() === needle);
  if (cached) return cached.id;
  const roles = await guild.client.rest.get<APIRole[]>(Routes.guildRoles(guild.id));
  const role = roles.find((r) => r.name?.toLowerCase() === needle);
  if (!role) return null;
  cacheRole(guild, role);
  return role.id;
}

/** Reorder roles; returns updated {@link Role} structures. */
export async function setRolePositions(
  guild: Guild,
  updates: Array<{ id: string; position?: number }>,
): Promise<Role[]> {
  return replaceRoles(
    guild,
    await guild.client.rest.patch<APIRole[]>(Routes.guildRoles(guild.id), {
      body: updates,
      auth: true,
    }),
  );
}

/** Update role hoist positions; returns updated {@link Role} structures. */
export async function setRoleHoistPositions(
  guild: Guild,
  updates: Array<{ id: string; hoistPosition?: number }>,
): Promise<Role[]> {
  return replaceRoles(
    guild,
    await guild.client.rest.patch<APIRole[]>(Routes.guildRolesHoistPositions(guild.id), {
      body: updates.map((u) => ({
        id: u.id,
        ...(u.hoistPosition !== undefined ? { hoist_position: u.hoistPosition } : {}),
      })),
      auth: true,
    }),
  );
}

/** Reset all role hoist positions; returns updated {@link Role} structures. */
export async function resetRoleHoistPositions(guild: Guild): Promise<Role[]> {
  return replaceRoles(
    guild,
    await guild.client.rest.delete<APIRole[]>(Routes.guildRolesHoistPositions(guild.id), {
      auth: true,
    }),
  );
}
