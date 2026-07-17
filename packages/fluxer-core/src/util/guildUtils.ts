import type { APIGuild, APIRole } from '@fluxerjs/types';

export type GatewayGuildPayload =
  | APIGuild
  | {
      id: string;
      properties: APIGuild;
      roles?: APIRole[];
    };

type NormalizedGuildPayload = APIGuild & { roles?: APIRole[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidGuildPayload(o: Record<string, unknown>): boolean {
  if (!Object.hasOwn(o, 'id') || typeof o.id !== 'string' || o.id.length === 0) return false;
  if ('name' in o && typeof o.name !== 'string') return false;
  if ('owner_id' in o && typeof o.owner_id !== 'string') return false;
  if ('features' in o && !Array.isArray(o.features)) return false;
  if ('afk_timeout' in o && typeof o.afk_timeout !== 'number') return false;

  for (const key of [
    'verification_level',
    'mfa_level',
    'nsfw_level',
    'explicit_content_filter',
    'default_message_notifications',
  ] as const) {
    if (key in o && typeof o[key] !== 'number') return false;
  }

  if ('icon' in o && o.icon !== null && typeof o.icon !== 'string') return false;
  if ('banner' in o && o.banner !== null && typeof o.banner !== 'string') return false;

  return true;
}

function isHydratableGuildPayload(o: Record<string, unknown>): boolean {
  return (
    isValidGuildPayload(o) &&
    Object.hasOwn(o, 'name') &&
    typeof o.name === 'string' &&
    Object.hasOwn(o, 'owner_id') &&
    typeof o.owner_id === 'string'
  );
}

/**
 * Normalize a READY/GUILD_CREATE snapshot to {@link APIGuild}.
 * Current gateway snapshots nest metadata under `properties`; full flat snapshots remain
 * supported for backwards compatibility.
 */
export function normalizeGuildSnapshotPayload(raw: unknown): NormalizedGuildPayload | null {
  if (!isRecord(raw)) return null;

  const flatPayload =
    isHydratableGuildPayload(raw) && (raw.roles === undefined || Array.isArray(raw.roles))
      ? raw
      : null;

  let nestedPayload: Record<string, unknown> | null = null;
  if (Object.hasOwn(raw, 'properties') && isRecord(raw.properties)) {
    const properties = raw.properties;
    const rolesValid = raw.roles === undefined || Array.isArray(raw.roles);
    if (rolesValid && isHydratableGuildPayload(properties) && raw.id === properties.id) {
      nestedPayload = { ...properties };
      if (raw.roles !== undefined) nestedPayload.roles = raw.roles;
    }
  }

  if ((flatPayload === null) === (nestedPayload === null)) return null;
  return (flatPayload ?? nestedPayload) as unknown as NormalizedGuildPayload;
}

/** Validate a flat GUILD_UPDATE payload without interpreting unknown fields. */
export function normalizeGuildUpdatePayload(raw: unknown): NormalizedGuildPayload | null {
  if (!isRecord(raw) || !isValidGuildPayload(raw)) return null;
  return raw as unknown as NormalizedGuildPayload;
}
