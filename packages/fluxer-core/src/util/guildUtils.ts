import { APIGuild, APIRole } from '@fluxerjs/types';

/** Guild payload shape from Fluxer gateway (GUILD_CREATE, GUILD_UPDATE, READY). */
type GatewayGuildPayload =
  | APIGuild
  | {
      id: string;
      properties?: Record<string, unknown>;
      roles?: APIRole[] | unknown;
      [key: string]: unknown;
    };

/**
 * Normalize gateway guild payload to APIGuild shape.
 * Fluxer gateway may send { id, properties: { owner_id, ... }, roles } instead of flat APIGuild.
 * @param raw - Raw guild data from gateway (accepts unknown for gateway payloads)
 * @returns Normalized APIGuild with roles, or null if raw is null/undefined
 */
export function normalizeGuildPayload(
  raw: GatewayGuildPayload | null | undefined | unknown,
): (APIGuild & { roles?: APIRole[] }) | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  if ('properties' in raw && raw.properties != null && typeof raw.properties === 'object') {
    const r = raw as { properties: Record<string, unknown>; roles?: APIRole[] | unknown };
    return {
      ...r.properties,
      roles: r.roles as APIRole[] | undefined,
    } as APIGuild & { roles?: APIRole[] };
  }
  return raw as APIGuild & { roles?: APIRole[] };
}
