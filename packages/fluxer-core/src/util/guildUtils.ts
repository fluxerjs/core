import type { APIGuild, APIRole } from '@fluxerjs/types';

export type GatewayGuildPayload =
  | APIGuild
  | {
      id: string;
      properties: APIGuild;
      roles?: APIRole[];
    };

/**
 * Validate and coerce a gateway guild payload to {@link APIGuild}.
 * Supports flat REST/update payloads and gateway snapshots with metadata nested under
 * `properties`. Requires a string `id`; other fields are type-checked only when present.
 */
export function normalizeGuildPayload(raw: unknown): (APIGuild & { roles?: APIRole[] }) | null {
  if (!raw || typeof raw !== 'object') return null;
  const gatewayPayload = raw as Record<string, unknown>;
  let o = gatewayPayload;

  if ('properties' in gatewayPayload) {
    if (!gatewayPayload.properties || typeof gatewayPayload.properties !== 'object') return null;
    o = {
      ...(gatewayPayload.properties as Record<string, unknown>),
      roles: gatewayPayload.roles,
    };
  }

  if (typeof o.id !== 'string' || o.id.length === 0) return null;
  if ('name' in o && typeof o.name !== 'string') return null;
  if ('owner_id' in o && typeof o.owner_id !== 'string') return null;
  if ('features' in o && !Array.isArray(o.features)) return null;
  if ('afk_timeout' in o && typeof o.afk_timeout !== 'number') return null;

  for (const key of [
    'verification_level',
    'mfa_level',
    'nsfw_level',
    'explicit_content_filter',
    'default_message_notifications',
  ] as const) {
    if (key in o && typeof o[key] !== 'number') return null;
  }

  if ('icon' in o && o.icon !== null && typeof o.icon !== 'string') return null;
  if ('banner' in o && o.banner !== null && typeof o.banner !== 'string') return null;

  return o as unknown as APIGuild & { roles?: APIRole[] };
}
