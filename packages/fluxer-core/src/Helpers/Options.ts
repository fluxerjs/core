import type { REST } from '@fluxerjs/rest';
import type { APIInstance, APIInstanceEndpoints } from '@fluxerjs/types';
import type { Logger, LogLevel } from '@fluxerjs/util';
import type { PresenceUpdateOptions } from '../ClientCore/SdkOptions/Presence.js';

/**
 * Optional cache size limits (FIFO eviction when exceeded).
 *
 * | Value | Meaning |
 * |-------|---------|
 * | positive number | Max entries |
 * | `0` or `Infinity` | Unbounded |
 * | `false` (`messages` only) | Message cache disabled |
 *
 * @see {@link DEFAULT_CACHE_LIMITS}
 * @see {@link resolveCacheLimits}
 */
export interface CacheSizeLimits {
  /** Max channels cached globally. `0` = unbounded. */
  channels?: number;
  /** Max guilds cached. `0` = unbounded. */
  guilds?: number;
  /** Max users cached globally. `0` = unbounded. */
  users?: number;
  /**
   * Max messages per channel, or `false` to disable message caching.
   * `0` / `Infinity` = unbounded (legacy `0` previously meant off — use `false`).
   */
  messages?: number | false;
  /** Max members per guild. `0` = unbounded. */
  members?: number;
  /** Max roles per guild. `0` = unbounded. @default 0 */
  roles?: number;
  /** Max emojis per guild. `0` = unbounded. @default 0 */
  emojis?: number;
  /** Max stickers per guild. `0` = unbounded. @default 0 */
  stickers?: number;
}

/**
 * Default cache policy — opt out per field with `0` (or `messages: false` to disable).
 * Applied when {@link ClientOptions.cache} is omitted or partial.
 */
export const DEFAULT_CACHE_LIMITS: Required<Omit<CacheSizeLimits, 'messages'>> & {
  messages: number;
} = {
  guilds: 200,
  users: 10_000,
  channels: 5_000,
  messages: 50,
  members: 5_000,
  roles: 0,
  emojis: 0,
  stickers: 0,
};

/**
 * Fully resolved cache limits used at runtime.
 * Numeric buckets use `Infinity` for unbounded; `messages` may be `false` (disabled).
 */
export interface ResolvedCacheLimits {
  guilds: number;
  channels: number;
  users: number;
  members: number;
  /** Per-channel message cap, `Infinity` if unbounded, or `false` if disabled. */
  messages: number | false;
  roles: number;
  emojis: number;
  stickers: number;
}

/** Result of {@link resolveCacheLimits}. */
export interface ResolvedCacheOptions {
  /** Limits for LimitedCollection / MessageCache. */
  limits: ResolvedCacheLimits;
  /** Merged options object stored on `client.options.cache`. */
  cache: Required<Omit<CacheSizeLimits, 'messages'>> & { messages: number | false };
}

function emitCacheWarning(message: string): void {
  if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
    process.emitWarning(message, { type: 'FluxerCache', code: 'FLUXER_CACHE_MESSAGES_ZERO' });
  } else {
    console.warn(message);
  }
}

/**
 * Normalize a numeric cache limit.
 * Positive finite → floored max; `0` / `Infinity` / NaN / negative → unbounded (`Infinity`).
 */
export function normalizeCacheLimit(value: number | undefined, fallback: number): number {
  const raw = value === undefined ? fallback : value;
  if (!Number.isFinite(raw) || raw <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(raw);
}

/**
 * Resolve and validate {@link ClientOptions.cache} once at Client construction.
 * Emits a warning when `messages: 0` is passed (legacy “off”; now unbounded — use `false`).
 */
export function resolveCacheLimits(input?: CacheSizeLimits): ResolvedCacheOptions {
  const merged: Required<Omit<CacheSizeLimits, 'messages'>> & { messages: number | false } = {
    guilds: input?.guilds ?? DEFAULT_CACHE_LIMITS.guilds,
    channels: input?.channels ?? DEFAULT_CACHE_LIMITS.channels,
    users: input?.users ?? DEFAULT_CACHE_LIMITS.users,
    members: input?.members ?? DEFAULT_CACHE_LIMITS.members,
    roles: input?.roles ?? DEFAULT_CACHE_LIMITS.roles,
    emojis: input?.emojis ?? DEFAULT_CACHE_LIMITS.emojis,
    stickers: input?.stickers ?? DEFAULT_CACHE_LIMITS.stickers,
    messages:
      input?.messages === undefined
        ? DEFAULT_CACHE_LIMITS.messages
        : (input.messages as number | false),
  };

  if (input && Object.hasOwn(input, 'messages') && input.messages === 0) {
    emitCacheWarning(
      'cache.messages: 0 is now unbounded (same as Infinity). Pass messages: false to disable the message cache.',
    );
  }

  const messagesLimit: number | false =
    merged.messages === false
      ? false
      : normalizeCacheLimit(
          merged.messages === undefined ? DEFAULT_CACHE_LIMITS.messages : merged.messages,
          DEFAULT_CACHE_LIMITS.messages,
        );

  return {
    cache: merged,
    limits: {
      guilds: normalizeCacheLimit(merged.guilds, DEFAULT_CACHE_LIMITS.guilds),
      channels: normalizeCacheLimit(merged.channels, DEFAULT_CACHE_LIMITS.channels),
      users: normalizeCacheLimit(merged.users, DEFAULT_CACHE_LIMITS.users),
      members: normalizeCacheLimit(merged.members, DEFAULT_CACHE_LIMITS.members),
      roles: normalizeCacheLimit(merged.roles, DEFAULT_CACHE_LIMITS.roles),
      emojis: normalizeCacheLimit(merged.emojis, DEFAULT_CACHE_LIMITS.emojis),
      stickers: normalizeCacheLimit(merged.stickers, DEFAULT_CACHE_LIMITS.stickers),
      messages: messagesLimit,
    },
  };
}

/**
 * Configuration options for {@link Client}.
 * @example
 * ```ts
 * const client = new Client({
 *   instance: { api: 'https://api.example.com' },
 *   cache: { guilds: 100, messages: 20 },
 *   waitForGuilds: true,
 * });
 * ```
 */
export interface ClientOptions {
  /**
   * Instance endpoints for this client (API, CDN, invite, etc.).
   * Pass a partial map to override hosted defaults, or a full discovery document.
   * Prefer this over `rest.api` for multi-instance / self-hosted bots.
   * @see {@link Client.fromDiscovery}
   */
  instance?: Partial<APIInstanceEndpoints> | APIInstance;
  /**
   * REST options. Prefer {@link ClientOptions.instance} for the API host.
   * If both `instance.api` (or resolved default) and `rest.api` are set and differ, construction throws.
   */
  rest?: Partial<ConstructorParameters<typeof REST>[0]>;
  /**
   * @deprecated Fluxer has no intents. Prefer {@link ignoredEvents}. Kept only for migration; identify always sends `0`.
   */
  intents?: number;
  /**
   * @deprecated No-op. Fluxer has no intents warning to suppress.
   */
  suppressIntentWarning?: boolean;
  /** {@link GatewayIdentifyFlags} bitfield sent as Identify `flags`. */
  identifyFlags?: number;
  /** Dispatch event names to suppress for this session (`ignored_events`). */
  ignoredEvents?: string[];
  /** Prefer hydrating this guild first after READY (`initial_guild_id`). */
  initialGuildId?: string;
  /**
   * Delay Ready until all READY guilds arrive via GUILD_CREATE; queue other dispatches until then.
   * @default false
   */
  waitForGuilds?: boolean;
  /**
   * Cache size limits per bucket. Defaults to {@link DEFAULT_CACHE_LIMITS}.
   * Pass `0` / `Infinity` per numeric field for unbounded; `messages: false` to disable message caching.
   * @see {@link CacheSizeLimits}
   */
  cache?: CacheSizeLimits;
  /**
   * Default allowed mentions when a send omits them (per-call wins).
   * @example
   * ```ts
   * defaultAllowedMentions: {
   *   parse: ['users'],
   *   repliedUser: false,
   * }
   * ```
   */
  defaultAllowedMentions?: {
    /** Mention types to parse (`roles`, `users`, `everyone`). */
    parse?: Array<'roles' | 'users' | 'everyone'>;
    /** Specific role IDs allowed to be mentioned. */
    roles?: string[];
    /** Specific user IDs allowed to be mentioned. */
    users?: string[];
    /** Whether to ping the user being replied to. */
    repliedUser?: boolean;
  };
  /**
   * Default reply ping for `message.reply` when `ping` is omitted.
   * @default true
   */
  defaultReplyPing?: boolean;
  /**
   * Initial presence on identify (also updatable via `client.user.setPresence`).
   * CamelCase only; mapped to gateway wire internally.
   */
  presence?: PresenceUpdateOptions;
  /**
   * Emit gateway debug strings.
   * @default true
   */
  gatewayDebug?: boolean;
  /**
   * Total gateway shard count, or `'auto'` to derive from guild count.
   * Fluxer's `/gateway/bot` currently stubs `shards: 1`, so prefer `'auto'` or an explicit count
   * for large bots (max 2500 guilds per shard).
   * Alias: `totalShards`.
   */
  shardCount?: number | 'auto';
  /**
   * Alias of {@link shardCount} (matches {@link import('@fluxerjs/sharding').ShardingManager} vocabulary).
   * @deprecated Prefer {@link shardCount}.
   */
  totalShards?: number | 'auto';
  /** Explicit shard ids this client should connect (defaults to `0..shardCount-1`). Alias: `shardList`. */
  shardIds?: number[];
  /**
   * Alias of {@link shardIds}.
   * @deprecated Prefer {@link shardIds}.
   */
  shardList?: number[];
  /**
   * Guilds per shard when {@link shardCount} is `'auto'`.
   * @default 1500
   */
  guildsPerShard?: number;
  /**
   * Custom WebSocket sharding strategy builder (e.g. WorkerShardingStrategy).
   * @see {@link import('@fluxerjs/ws').WorkerShardingStrategy}
   */
  buildStrategy?: import('@fluxerjs/ws').BuildShardingStrategyFn;
  /**
   * Optional session store for RESUME across restarts (defaults to in-memory).
   */
  sessionStore?: import('@fluxerjs/ws').ISessionStore;
  /**
   * Optional identify throttler (e.g. parent-backed when under ShardingManager).
   */
  identifyThrottler?: import('@fluxerjs/ws').IIdentifyThrottler;
  /** Minimum log level for {@link Client.logger}. Default: `warn`. */
  logLevel?: LogLevel;
  /** Custom logger instance (overrides {@link logLevel} sink defaults). */
  logger?: Logger;
  /**
   * Defer dispatch handlers to the next macrotask so WS `message` stays responsive.
   * @default true (`false` useful in tests)
   */
  gatewayDeferHandlers?: boolean;
  /**
   * Optional WebSocket constructor (e.g. `ws` in Node).
   * Provide if the runtime lacks a native WebSocket implementation.
   */
  WebSocket?: new (
    url: string,
  ) => {
    send(data: string | ArrayBufferLike): void;
    close(code?: number): void;
    readyState: number;
    addEventListener?(type: string, listener: (e: unknown) => void): void;
    on?(event: string, cb: (data?: unknown) => void): void;
  };
}
