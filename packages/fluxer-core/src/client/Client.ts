import { EventEmitter } from 'events';
import { REST } from '@fluxerjs/rest';
import type { WebSocketManager } from '@fluxerjs/ws';
import { Routes } from '@fluxerjs/types';
import type {
  APIBulkMessageFetchResponse,
  APIEmojiMetadata,
  APIGatewayBotResponse,
  APIInstance,
  APIApplicationMe,
  APIOAuthApplication,
  APIPreloadMessagesResponse,
  APIStickerMetadata,
  APIUserPartial,
  APIUserTagCheck,
  APIMessage,
  GatewayReceivePayload,
  GatewaySendPayload,
} from '@fluxerjs/types';
import { ChannelManager } from './ChannelManager.js';
import { GuildManager } from './GuildManager.js';
import { type ClientOptions, DEFAULT_CACHE_LIMITS } from '../util/Options.js';
import {
  normalizeApiOrigin,
  parseInstanceDiscovery,
  resolveInstanceEndpoints,
  resolveRestApi,
  type ResolvedInstance,
} from '../util/instance.js';
import type { ClientUser } from './ClientUser.js';
import type { GuildMember } from '../structures/GuildMember.js';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { User } from '../structures/User.js';
import { UserManager } from './UserManager.js';
import { PackManager } from './PackManager.js';
import type { BulkFetchMessagesOptions, BulkFetchMessagesResult } from './MessageManager.js';
import type { BulkFetchMessagesRequest } from './sdkOptions.js';
import {
  type ClientEventListener,
  type ClientEventMethods,
  type ClientEventName,
  type ClientEvents,
  createEventMethods,
} from './ClientEvents.js';
import {
  bulkFetchMessages as runBulkFetchMessages,
  checkUsernameTag as runCheckUsernameTag,
  fetchApplication as runFetchApplication,
  fetchEmojiMetadata as runFetchEmojiMetadata,
  fetchGatewayInfo as runFetchGatewayInfo,
  fetchInstance as runFetchInstance,
  fetchOAuthApplications as runFetchOAuthApplications,
  fetchStickerMetadata as runFetchStickerMetadata,
  preloadMessages as runPreloadMessages,
  preloadMessagesAlt as runPreloadMessagesAlt,
  resolveClientEmoji,
} from './clientEmoji.js';
import { MessageCache } from './MessageCache.js';
import { handleGatewayDispatch } from './GatewayDispatch.js';
import {
  clearGuildStreamSettle,
  connectClientGateway,
  finalizeClientReady,
  onClientGuildReceived,
} from './GatewayReady.js';

export type { ClientEvents, ClientEventMethods } from './ClientEvents.js';
export type { ResolvedInstance } from '../util/instance.js';

/** Bootstrap origin for {@link Client.fromDiscovery}. */
export type DiscoveryOrigin = string | { api: string; version?: string };

/** Main Fluxer bot client. Connects to the gateway, emits events, and provides REST access. */
export class Client extends EventEmitter {
  /** REST client for making API requests. */
  readonly rest: REST;
  /**
   * Resolved instance endpoints (API, CDN, invite, …) for this client.
   * Isolated per client — safe for multi-instance processes.
   */
  readonly instance: ResolvedInstance;
  /** Guild cache and manager. */
  readonly guilds: GuildManager;
  /** Channel cache and manager. */
  readonly channels: ChannelManager;
  /** User cache and manager. */
  readonly users: UserManager;
  /** Emoji/sticker pack REST wrappers (`/packs/*`). */
  readonly packs = new PackManager(this);
  /** Typed event handlers. Prefer `client.events.*` or `client.on(Events.*, ...)`. */
  readonly events: ClientEventMethods;
  /** The authenticated bot user. Null until READY is received. */
  user: ClientUser | null = null;
  /** Timestamp when the client became ready. Null until READY is received. */
  readyAt: Date | null = null;
  /** @internal WebSocket manager. */
  _ws: WebSocketManager | null = null;
  /** When waitForGuilds, guild IDs still expected via GUILD_CREATE. */
  _pendingGuildIds: Set<string> | null = null;
  /** @internal Timeout when READY has no guilds but waitForGuilds is set. */
  _guildStreamSettleTimeout: ReturnType<typeof setTimeout> | null = null;
  /** @internal Dispatches queued until Ready when waitForGuilds delays Ready. */
  _deferredGatewayDispatches: GatewayReceivePayload[] = [];
  private readonly _messageCache = new MessageCache(() => this.options.cache?.messages ?? 0);
  /** Resolved client options (cache defaults applied). */
  readonly options: ClientOptions;

  constructor(options: ClientOptions = {}) {
    super();
    this.options = {
      ...options,
      cache: { ...DEFAULT_CACHE_LIMITS, ...options.cache },
      defaultReplyPing: options.defaultReplyPing ?? true,
    };
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.users = new UserManager(this);
    const restApi = options.rest?.api;
    if (options.instance !== undefined) {
      this.instance = resolveInstanceEndpoints(options.instance);
      resolveRestApi(this.instance.endpoints.api, restApi); // throws on conflict
    } else {
      // Legacy: `rest.api` alone overrides the hosted API host.
      this.instance = resolveInstanceEndpoints(
        restApi !== undefined ? { api: restApi } : undefined,
      );
    }
    this.setMaxListeners(0);
    this.events = createEventMethods(this);
    for (const manager of [this.channels, this.guilds, this.users] as const) {
      Object.defineProperty(manager, 'cache', { get: () => manager, configurable: true });
    }
    this.rest = new REST({
      ...this.options.rest,
      api: this.instance.endpoints.api,
      version: this.options.rest?.version ?? '1',
    });
  }

  /**
   * Create a client from instance discovery (`GET /.well-known/fluxer`).
   * Does not log in — call {@link login} with a token afterward.
   *
   * @param origin - API origin used only to fetch discovery (e.g. `https://api.example.com`)
   * @param options - Client options (must not conflict with discovered `endpoints.api`)
   * @param connectOptions - Optional abort signal for the discovery request
   */
  static async fromDiscovery(
    origin: DiscoveryOrigin,
    options: Omit<ClientOptions, 'instance'> = {},
    connectOptions?: { signal?: AbortSignal },
  ): Promise<Client> {
    const bootstrapApi =
      typeof origin === 'string' ? normalizeApiOrigin(origin) : normalizeApiOrigin(origin.api);
    const version =
      typeof origin === 'string'
        ? (options.rest?.version ?? '1')
        : (origin.version ?? options.rest?.version ?? '1');
    const bootstrap = new REST({
      ...(options.rest ?? {}),
      api: bootstrapApi,
      version,
    });
    const raw: unknown = await bootstrap.get(Routes.instanceDiscovery(), {
      auth: false,
      ...(connectOptions?.signal ? { signal: connectOptions.signal } : {}),
    });
    const discovery = parseInstanceDiscovery(raw);
    const { rest, ...restOptions } = options;
    return new Client({
      ...restOptions,
      // Drop rest.api so discovered endpoints.api owns the host; keep other REST opts.
      ...(rest ? { rest: { ...rest, api: undefined } } : {}),
      instance: discovery,
    });
  }

  /** Register an event listener for a specific event type. */
  override on<K extends ClientEventName>(event: K, listener: ClientEventListener<K>): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this;
  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  /** Register a one-time event listener for a specific event type. */
  override once<K extends ClientEventName>(event: K, listener: ClientEventListener<K>): this;
  override once(event: string | symbol, listener: (...args: unknown[]) => void): this;
  override once(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.once(event, listener);
  }

  /** Remove an event listener for a specific event type. */
  override off<K extends ClientEventName>(event: K, listener: ClientEventListener<K>): this;
  override off(event: string | symbol, listener: (...args: unknown[]) => void): this;
  override off(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.off(event, listener);
  }

  /** Emit an event with typed arguments. */
  override emit<K extends ClientEventName>(event: K, ...args: ClientEvents[K]): boolean;
  override emit(event: string | symbol, ...args: unknown[]): boolean;
  override emit(event: string | symbol, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  /**
   * Resolve emoji input to API format (e.g., `name:id` or Unicode).
   * @param emoji - Emoji string or object with name/id/animated
   * @param guildId - Guild ID for custom emoji lookup (optional)
   * @returns Resolved emoji string for API payloads
   */
  async resolveEmoji(
    emoji: string | { name: string; id?: string; animated?: boolean },
    guildId?: string | null,
  ): Promise<string> {
    return resolveClientEmoji(this, emoji, guildId);
  }

  /**
   * Fetch instance discovery document (`/.well-known/fluxer`).
   * @returns Instance configuration (endpoints, features, metadata)
   */
  fetchInstance(): Promise<APIInstance> {
    return runFetchInstance(this);
  }

  /**
   * Fetch gateway connection info (`/gateway`).
   * @returns Gateway URL, recommended shard count, session start limit
   */
  fetchGatewayInfo(): Promise<APIGatewayBotResponse> {
    return runFetchGatewayInfo(this);
  }

  /**
   * Fetch emoji metadata by ID.
   * @param emojiId - Emoji snowflake
   * @returns Emoji metadata (name, pack, tags, etc.)
   */
  fetchEmojiMetadata(emojiId: string): Promise<APIEmojiMetadata> {
    return runFetchEmojiMetadata(this, emojiId);
  }

  /**
   * Fetch sticker metadata by ID.
   * @param stickerId - Sticker snowflake
   * @returns Sticker metadata (name, pack, tags, etc.)
   */
  fetchStickerMetadata(stickerId: string): Promise<APIStickerMetadata> {
    return runFetchStickerMetadata(this, stickerId);
  }

  /**
   * Fetch the current application (`/applications/@me`).
   * @returns Application metadata (owner, flags, RPC origins, etc.)
   */
  fetchApplication(): Promise<APIApplicationMe> {
    return runFetchApplication(this);
  }

  /**
   * Fetch OAuth2 applications owned by this bot.
   * @returns Array of OAuth application objects
   */
  fetchOAuthApplications(): Promise<APIOAuthApplication[]> {
    return runFetchOAuthApplications(this);
  }

  /**
   * Check username#discriminator availability.
   * @param username - Username to check
   * @param discriminator - Discriminator to check
   * @returns Availability result
   */
  checkUsernameTag(username: string, discriminator: string): Promise<APIUserTagCheck> {
    return runCheckUsernameTag(this, username, discriminator);
  }

  /**
   * Preload recent messages for multiple channels (batch endpoint).
   * @param channelIds - Array of channel IDs to preload
   * @returns Preload response with message counts/timestamps
   */
  preloadMessages(channelIds: string[]): Promise<APIPreloadMessagesResponse> {
    return runPreloadMessages(this, channelIds);
  }

  /**
   * Preload recent messages (alternate endpoint).
   * @param channelIds - Array of channel IDs to preload
   * @returns Preload response with message counts/timestamps
   */
  preloadMessagesAlt(channelIds: string[]): Promise<APIPreloadMessagesResponse> {
    return runPreloadMessagesAlt(this, channelIds);
  }

  bulkFetchMessages(
    requests: BulkFetchMessagesRequest[],
    options?: BulkFetchMessagesOptions & { hydrate?: true },
  ): Promise<BulkFetchMessagesResult>;
  bulkFetchMessages(
    requests: BulkFetchMessagesRequest[],
    options: BulkFetchMessagesOptions & { hydrate: false },
  ): Promise<APIBulkMessageFetchResponse>;
  bulkFetchMessages(
    requests: BulkFetchMessagesRequest[],
    options: BulkFetchMessagesOptions = {},
  ): Promise<BulkFetchMessagesResult | APIBulkMessageFetchResponse> {
    return runBulkFetchMessages(this, requests, options);
  }

  /** @internal */
  _getMessageCache(channelId: string): Map<string, APIMessage> | null {
    return this._messageCache.get(channelId);
  }

  /** @internal */
  _addMessageToCache(channelId: string, data: APIMessage): void {
    this._messageCache.add(channelId, data);
  }

  /** @internal */
  _removeMessageFromCache(channelId: string, messageId: string): void {
    this._messageCache.remove(channelId, messageId);
  }

  /** @internal */
  _clearMessageCache(channelId: string): void {
    this._messageCache.clearChannel(channelId);
  }

  /**
   * Sweep cached messages (remove entries matching filter).
   * @param filter - Predicate to test each message (return true to remove)
   * @param channelId - Optional channel ID to scope sweep
   * @returns Count of messages removed
   */
  sweepMessages(
    filter?: (message: APIMessage, channelId: string) => boolean,
    channelId?: string,
  ): number {
    return this._messageCache.sweep(filter, channelId);
  }

  /**
   * Sweep cached members across all guilds (remove entries matching filter).
   * @param filter - Predicate to test each member (return true to remove)
   * @returns Total count of members removed
   */
  sweepMembers(filter?: (member: GuildMember, guildId: string) => boolean): number {
    let removed = 0;
    for (const guild of this.guilds.values()) {
      removed += guild.members.sweep(filter ? (m) => filter(m, guild.id) : undefined);
    }
    return removed;
  }

  /**
   * Get or create a {@link User} from partial API data (hydrates cache).
   * @param data - Partial user data from API
   * @returns Existing or newly created User instance
   * @internal
   */
  getOrCreateUser(data: APIUserPartial): User {
    const existing = this.users.get(data.id);
    if (existing) {
      existing._patch(data);
      return existing;
    }
    const user = new User(this, data);
    this.users.set(user.id, user);
    return user;
  }

  /**
   * The underlying {@link WebSocketManager} (throws if not logged in).
   * @throws {@link FluxerError} with {@link ErrorCodes.NotLoggedIn}
   */
  get ws(): WebSocketManager {
    if (!this._ws) {
      throw new FluxerError('Client is not logged in. Call login() first.', {
        code: ErrorCodes.NotLoggedIn,
      });
    }
    return this._ws;
  }

  /**
   * Send a gateway payload to a specific shard.
   * @param shardId - Shard ID (0-indexed)
   * @param payload - Gateway send payload (opcode + data)
   */
  sendToGateway(shardId: number, payload: GatewaySendPayload): void {
    this.ws.send(shardId, payload);
  }

  /**
   * Broadcast a gateway payload to all shards.
   * @param payload - Gateway send payload
   * @internal
   */
  _sendToAllShards(payload: GatewaySendPayload): void {
    const count = this.ws.getShardCount() || 1;
    for (let shardId = 0; shardId < count; shardId++) {
      this.ws.send(shardId, payload);
    }
  }

  /** @internal Process gateway dispatch payloads. */
  private handleDispatch(payload: GatewayReceivePayload): Promise<void> {
    return handleGatewayDispatch(this, payload, this._deferredGatewayDispatches);
  }

  /**
   * Connect to the gateway with a bot token.
   * @param token - Bot token from the developer portal
   * @param options - Optional abort signal for cancellation
   * @returns The token that was used (echo)
   * @throws {@link FluxerError} if already logged in or token is invalid
   */
  async login(token: string, options?: { signal?: AbortSignal }): Promise<string> {
    if (this._ws) {
      throw new FluxerError('Client is already logged in. Call destroy() first.', {
        code: ErrorCodes.AlreadyLoggedIn,
      });
    }
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new FluxerError('Bot token is required.', { code: ErrorCodes.InvalidToken });
    }
    this.rest.setToken(token);
    try {
      this._ws = await connectClientGateway(this, token, options?.signal);
      return token;
    } catch (err) {
      this._ws?.destroy();
      this._ws = null;
      this.rest.setToken(null);
      throw err;
    }
  }

  /** @internal Finalize the READY event emission. */
  _finalizeReady(): void {
    finalizeClientReady(this);
  }

  /** @internal Mark a guild as received during startup. */
  _onGuildReceived(guildId: string): void {
    onClientGuildReceived(this, guildId);
  }

  /**
   * Disconnect from gateway, clear all caches, and reset state.
   * Safe to call {@link login} again after destroy.
   */
  async destroy(): Promise<void> {
    clearGuildStreamSettle(this);
    this._deferredGatewayDispatches = [];
    this._ws?.destroy();
    this._ws = null;
    this.rest.setToken(null);
    this.user = null;
    this.readyAt = null;
    this._pendingGuildIds = null;
    this.guilds.clear();
    this.channels.clear();
    this.users.clear();
    this._messageCache.reset();
  }

  /**
   * Type guard for ready state (narrows `client.user` to non-null).
   * @returns true if Ready was received
   */
  isReady(): this is Client & { user: NonNullable<Client['user']> } {
    return this.readyAt !== null && this.user !== null;
  }

  /**
   * Assertion that client is ready (throws if not).
   * @throws {@link FluxerError} with {@link ErrorCodes.ClientNotReady}
   */
  assertReady(): asserts this is Client & { user: NonNullable<Client['user']> } {
    if (!this.isReady()) {
      throw new FluxerError(
        'Client is not ready yet. Wait for the Ready event before accessing client.user.',
        { code: ErrorCodes.ClientNotReady },
      );
    }
  }

  static get Routes(): typeof Routes {
    return Routes;
  }
}
