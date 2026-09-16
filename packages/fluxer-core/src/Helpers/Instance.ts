import type { APIInstance, APIInstanceEndpoints } from '@fluxerjs/types';
import { isRecord } from '@fluxerjs/util';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import { CDN_URL, STATIC_CDN_URL } from './Constants.js';

/** Hosted Fluxer production endpoints (default when no instance is configured). */
export const DEFAULT_INSTANCE_ENDPOINTS: Readonly<APIInstanceEndpoints> = Object.freeze({
  api: 'https://web.fluxer.app/api',
  api_client: 'https://web.fluxer.app/api',
  api_public: 'https://api.fluxer.app',
  gateway: 'wss://gateway.fluxer.app',
  media: CDN_URL,
  static_cdn: STATIC_CDN_URL,
  marketing: 'https://fluxer.app',
  admin: 'https://admin.fluxer.app',
  invite: 'https://fluxer.gg',
  gift: 'https://fluxer.gift',
  webapp: 'https://web.fluxer.app',
});

/** Immutable resolved instance descriptor attached to each {@link Client}. */
export interface ResolvedInstance {
  readonly endpoints: Readonly<APIInstanceEndpoints>;
  /** Full discovery document when available (fromDiscovery / fetchInstance). */
  readonly discovery: Readonly<APIInstance> | null;
}

const ENDPOINT_KEYS = [
  'api',
  'api_client',
  'api_public',
  'gateway',
  'media',
  'static_cdn',
  'marketing',
  'admin',
  'invite',
  'gift',
  'webapp',
] as const satisfies ReadonlyArray<keyof APIInstanceEndpoints>;

function requireString(obj: Record<string, unknown>, key: string, path: string): string {
  const value = obj[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new FluxerError(`Invalid instance discovery: ${path}.${key} must be a non-empty string`, {
      code: ErrorCodes.InvalidInstanceDiscovery,
    });
  }
  return value;
}

/** Unversioned well-known path (`GET /.well-known/fluxer`). */
export const INSTANCE_DISCOVERY_PATH = '/.well-known/fluxer' as const;

/**
 * Absolute unversioned discovery URL for an origin.
 * Hosted Fluxer: `https://fluxer.app/.well-known/fluxer` (may 308 to `api_public`).
 */
export function instanceDiscoveryUrl(origin: string): string {
  return `${normalizeApiOrigin(origin)}${INSTANCE_DISCOVERY_PATH}`;
}

/** Strip trailing `/vN` and trailing slash from an API origin. */
export function normalizeApiOrigin(api: string): string {
  const trimmed = api.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/v\d+$/i, '');
}

/** Normalize invite base to origin without trailing slash. */
export function normalizeInviteBase(invite: string): string {
  return invite.trim().replace(/\/+$/, '');
}

/**
 * Validate a raw discovery payload and return a typed {@link APIInstance}.
 * @throws FluxerError with {@link ErrorCodes.InvalidInstanceDiscovery}
 */
export function parseInstanceDiscovery(raw: unknown): APIInstance {
  if (!isRecord(raw)) {
    throw new FluxerError('Invalid instance discovery: expected an object', {
      code: ErrorCodes.InvalidInstanceDiscovery,
    });
  }
  if (typeof raw.api_code_version !== 'number' || !Number.isFinite(raw.api_code_version)) {
    throw new FluxerError('Invalid instance discovery: api_code_version must be a number', {
      code: ErrorCodes.InvalidInstanceDiscovery,
    });
  }
  if (!isRecord(raw.endpoints)) {
    throw new FluxerError('Invalid instance discovery: endpoints must be an object', {
      code: ErrorCodes.InvalidInstanceDiscovery,
    });
  }

  const endpoints = {} as APIInstanceEndpoints;
  for (const key of ENDPOINT_KEYS) {
    endpoints[key] = requireString(raw.endpoints, key, 'endpoints');
  }
  endpoints.api = normalizeApiOrigin(endpoints.api);
  endpoints.api_client = normalizeApiOrigin(endpoints.api_client);
  endpoints.api_public = normalizeApiOrigin(endpoints.api_public);
  endpoints.invite = normalizeInviteBase(endpoints.invite);
  endpoints.media = endpoints.media.replace(/\/+$/, '');
  endpoints.static_cdn = endpoints.static_cdn.replace(/\/+$/, '');

  return {
    api_code_version: raw.api_code_version,
    endpoints,
    captcha: (raw.captcha as APIInstance['captcha']) ?? {
      provider: 'none',
      hcaptcha_site_key: null,
      turnstile_site_key: null,
    },
    features: (raw.features as APIInstance['features']) ?? {
      voice_enabled: true,
      stripe_enabled: false,
      self_hosted: false,
      presigned_attachment_uploads: false,
      emails_enabled: false,
    },
    gif: (raw.gif as APIInstance['gif']) ?? {
      provider: 'none',
      display_name: '',
      attribution_required: false,
    },
    sso: (raw.sso as APIInstance['sso']) ?? {
      enabled: false,
      enforced: false,
      display_name: null,
      redirect_uri: '',
    },
    registration: (raw.registration as APIInstance['registration']) ?? {
      mode: 'open',
      admin_registration_urls_enabled: false,
    },
    community: (raw.community as APIInstance['community']) ?? {
      single_community: false,
      single_community_guild_id: null,
      direct_messages_disabled: false,
    },
    services: (raw.services as APIInstance['services']) ?? {
      gif_enabled: false,
      youtube_enabled: false,
      bluesky_enabled: false,
    },
    limits: (raw.limits as APIInstance['limits']) ?? {
      version: 2,
      traitDefinitions: [],
      rules: [],
      defaultsHash: '',
    },
    push: (raw.push as APIInstance['push']) ?? { public_vapid_key: null },
    app_public: (raw.app_public as APIInstance['app_public']) ?? {},
  };
}

/**
 * Merge partial endpoint overrides onto hosted defaults.
 * Accepts either a full {@link APIInstance} or a partial endpoint map.
 */
export function resolveInstanceEndpoints(
  input?: Partial<APIInstanceEndpoints> | APIInstance | null,
): ResolvedInstance {
  if (!input) {
    return Object.freeze({
      endpoints: DEFAULT_INSTANCE_ENDPOINTS,
      discovery: null,
    });
  }

  const isFull =
    'endpoints' in input &&
    isRecord((input as APIInstance).endpoints) &&
    typeof (input as APIInstance).api_code_version === 'number';

  if (isFull) {
    const discovery = parseInstanceDiscovery(input);
    return Object.freeze({
      endpoints: Object.freeze({ ...discovery.endpoints }),
      discovery: Object.freeze(discovery),
    });
  }

  const partial = input as Partial<APIInstanceEndpoints>;
  const merged: APIInstanceEndpoints = { ...DEFAULT_INSTANCE_ENDPOINTS };
  for (const key of ENDPOINT_KEYS) {
    const value = partial[key];
    if (typeof value === 'string' && value.length > 0) {
      merged[key] = value;
    }
  }
  merged.api = normalizeApiOrigin(merged.api);
  merged.api_client = normalizeApiOrigin(merged.api_client);
  merged.api_public = normalizeApiOrigin(merged.api_public);
  // Legacy partials set `api` as the bot REST host; copy onto api_public when omitted.
  if (
    typeof partial.api === 'string' &&
    partial.api.length > 0 &&
    (typeof partial.api_public !== 'string' || partial.api_public.length === 0)
  ) {
    merged.api_public = merged.api;
  }
  merged.invite = normalizeInviteBase(merged.invite);
  merged.media = merged.media.replace(/\/+$/, '');
  merged.static_cdn = merged.static_cdn.replace(/\/+$/, '');

  return Object.freeze({
    endpoints: Object.freeze(merged),
    discovery: null,
  });
}

/**
 * Resolve REST `api` from instance `api_public` + optional `rest.api`.
 * Throws when both are set and disagree.
 */
export function resolveRestApi(instanceApiPublic: string, restApi: string | undefined): string {
  const fromInstance = normalizeApiOrigin(instanceApiPublic);
  if (restApi === undefined) return fromInstance;
  const fromRest = normalizeApiOrigin(restApi);
  if (fromRest !== fromInstance) {
    throw new FluxerError(
      `Conflicting API hosts: instance.api_public (${fromInstance}) vs rest.api (${fromRest}). Prefer ClientOptions.instance.`,
      { code: ErrorCodes.ConflictingInstanceConfig },
    );
  }
  return fromInstance;
}

/** Build an invite URL for a code using the instance invite base. */
export function inviteUrl(inviteBase: string, code: string): string {
  return `${normalizeInviteBase(inviteBase)}/${code}`;
}
