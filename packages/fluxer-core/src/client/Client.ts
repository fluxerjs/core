import { EventEmitter } from 'events';
import { REST } from '@fluxerjs/rest';
import { WebSocketManager } from '@fluxerjs/ws';
import {
  APIApplicationCommandInteraction,
  APIEmbed,
  GatewayGuildRoleCreateDispatchData,
  GatewayGuildRoleDeleteDispatchData,
  GatewayGuildRoleUpdateDispatchData,
  GatewayInviteDeleteDispatchData,
  GatewayMessageDeleteBulkDispatchData,
  GatewayTypingStartDispatchData,
  GatewayUserUpdateDispatchData,
  Routes,
} from '@fluxerjs/types';
import { ChannelManager } from './ChannelManager.js';
import { GuildManager } from './GuildManager.js';
import { ClientOptions } from '../util/Options.js';
import { ClientUser } from './ClientUser.js';
import { Guild } from '../structures/Guild.js';
import { Channel, GuildChannel } from '../structures/Channel.js';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { Events } from '../util/Events.js';
import {
  GatewayReceivePayload,
  GatewaySendPayload,
  GatewayVoiceStateUpdateDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayMessageReactionRemoveEmojiDispatchData,
  GatewayMessageReactionRemoveAllDispatchData,
  GatewayReactionEmoji,
  GatewayGuildEmojisUpdateDispatchData,
  GatewayGuildStickersUpdateDispatchData,
  GatewayGuildIntegrationsUpdateDispatchData,
  GatewayGuildScheduledEventCreateDispatchData,
  GatewayGuildScheduledEventUpdateDispatchData,
  GatewayGuildScheduledEventDeleteDispatchData,
  GatewayChannelPinsUpdateDispatchData,
  GatewayPresenceUpdateDispatchData,
  GatewayWebhooksUpdateDispatchData,
} from '@fluxerjs/types';
import { APIChannel, APIGuild, APIUser, APIUserPartial, APIInstance } from '@fluxerjs/types';
import {
  emitDeprecationWarning,
  formatEmoji,
  getUnicodeFromShortcode,
  parseEmoji,
} from '@fluxerjs/util';
import { User } from '../structures/User.js';
import { UsersManager } from './UsersManager.js';
import { eventHandlers } from './EventHandlerRegistry.js';
import { normalizeGuildPayload } from '../util/guildUtils';
import { Message } from '../structures/Message';
import { PartialMessage } from '../structures/PartialMessage';
import { MessageReaction } from '../structures/MessageReaction';
import { GuildMember } from '../structures/GuildMember';
import { GuildBan } from '../structures/GuildBan';
import { Invite } from '../structures/Invite';

/**
 * Callback parameter types for client events. Use with client.on(Events.X, handler).
 * @see Events
 */
export interface ClientEvents {
  [Events.Ready]: [];
  [Events.MessageCreate]: [message: Message];
  [Events.MessageUpdate]: [oldMessage: Message | null, newMessage: Message];
  [Events.MessageDelete]: [message: PartialMessage];
  [Events.MessageReactionAdd]: [
    reaction: MessageReaction,
    user: User,
    messageId: string,
    channelId: string,
    emoji: GatewayReactionEmoji,
    userId: string,
  ];
  [Events.MessageReactionRemove]: [
    reaction: MessageReaction,
    user: User,
    messageId: string,
    channelId: string,
    emoji: GatewayReactionEmoji,
    userId: string,
  ];
  [Events.MessageReactionRemoveAll]: [data: GatewayMessageReactionRemoveAllDispatchData];
  [Events.MessageReactionRemoveEmoji]: [data: GatewayMessageReactionRemoveEmojiDispatchData];
  [Events.InteractionCreate]: [interaction: APIApplicationCommandInteraction];
  [Events.GuildCreate]: [guild: Guild];
  [Events.GuildUpdate]: [oldGuild: Guild, newGuild: Guild];
  [Events.GuildDelete]: [guild: Guild];
  [Events.ChannelCreate]: [channel: GuildChannel];
  [Events.ChannelUpdate]: [oldChannel: Channel, newChannel: Channel];
  [Events.ChannelDelete]: [channel: Channel];
  [Events.GuildMemberAdd]: [member: GuildMember];
  [Events.GuildMemberUpdate]: [oldMember: GuildMember, newMember: GuildMember];
  [Events.GuildMemberRemove]: [member: GuildMember];
  [Events.VoiceStateUpdate]: [data: GatewayVoiceStateUpdateDispatchData];
  [Events.VoiceServerUpdate]: [data: GatewayVoiceServerUpdateDispatchData];
  [Events.VoiceStatesSync]: [
    data: { guildId: string; voiceStates: Array<{ user_id: string; channel_id: string | null }> },
  ];
  [Events.MessageDeleteBulk]: [data: GatewayMessageDeleteBulkDispatchData];
  [Events.GuildBanAdd]: [ban: GuildBan];
  [Events.GuildBanRemove]: [ban: GuildBan];
  [Events.GuildEmojisUpdate]: [data: GatewayGuildEmojisUpdateDispatchData];
  [Events.GuildStickersUpdate]: [data: GatewayGuildStickersUpdateDispatchData];
  [Events.GuildIntegrationsUpdate]: [data: GatewayGuildIntegrationsUpdateDispatchData];
  [Events.GuildRoleCreate]: [data: GatewayGuildRoleCreateDispatchData];
  [Events.GuildRoleUpdate]: [data: GatewayGuildRoleUpdateDispatchData];
  [Events.GuildRoleDelete]: [data: GatewayGuildRoleDeleteDispatchData];
  [Events.GuildScheduledEventCreate]: [data: GatewayGuildScheduledEventCreateDispatchData];
  [Events.GuildScheduledEventUpdate]: [data: GatewayGuildScheduledEventUpdateDispatchData];
  [Events.GuildScheduledEventDelete]: [data: GatewayGuildScheduledEventDeleteDispatchData];
  [Events.ChannelPinsUpdate]: [data: GatewayChannelPinsUpdateDispatchData];
  [Events.InviteCreate]: [invite: Invite];
  [Events.InviteDelete]: [data: GatewayInviteDeleteDispatchData];
  [Events.TypingStart]: [data: GatewayTypingStartDispatchData];
  [Events.UserUpdate]: [data: GatewayUserUpdateDispatchData];
  [Events.PresenceUpdate]: [data: GatewayPresenceUpdateDispatchData];
  [Events.WebhooksUpdate]: [data: GatewayWebhooksUpdateDispatchData];
  [Events.Resumed]: [];
  [Events.Error]: [error: Error];
  [Events.Debug]: [message: string];
}

/** Typed event handler methods. Use client.events.MessageReactionAdd((reaction, user, messageId, channelId, emoji, userId) => {...}) or client.on(Events.MessageReactionAdd, ...). */
export type ClientEventMethods = {
  [K in keyof typeof Events]: (cb: (...args: ClientEvents[(typeof Events)[K]]) => void) => Client;
};

function createEventMethods(client: Client): ClientEventMethods {
  const result: Record<string, (cb: (...args: unknown[]) => void) => Client> = {};
  for (const key of Object.keys(Events) as (keyof typeof Events)[]) {
    const eventName = Events[key];
    result[key] = (cb) => {
      client.on(eventName, cb as (...args: unknown[]) => void);
      return client;
    };
  }
  return result as ClientEventMethods;
}

/** Main Fluxer bot client. Connects to the gateway, emits events, and provides REST access. */
export class Client extends EventEmitter {
  readonly rest: REST;
  readonly guilds = new GuildManager(this);
  readonly channels = new ChannelManager(this);
  readonly users = new UsersManager(this);
  /** Typed event handlers. Use client.events.MessageReactionAdd((reaction, user, messageId, channelId, emoji, userId) => {...}) or client.on(Events.MessageReactionAdd, ...). */
  readonly events: ClientEventMethods;
  /** The authenticated bot user. Null until READY is received. */
  user: ClientUser | null = null;
  /** Timestamp when the client became ready. Null until READY is received. */
  readyAt: Date | null = null;
  private _ws: WebSocketManager | null = null;

  /** @param options - Token, REST config, WebSocket, presence, etc. */
  constructor(public readonly options: ClientOptions = {}) {
    super();
    this.events = createEventMethods(this);
    Object.defineProperty(this.channels, 'cache', {
      get: () => this.channels,
      configurable: true,
    });
    Object.defineProperty(this.guilds, 'cache', {
      get: () => this.guilds,
      configurable: true,
    });
    Object.defineProperty(this.users, 'cache', {
      get: () => this.users,
      configurable: true,
    });
    this.rest = new REST({
      api: options.rest?.api ?? 'https://api.fluxer.app',
      version: options.rest?.version ?? '1',
      ...options.rest,
    });
  }

  /**
   * Resolve an emoji argument to the API format (unicode or "name:id").
   * Supports: <:name:id>, :name:, name:id, { name, id }, unicode.
   * When id is missing (e.g. :name:), fetches guild emojis if guildId provided.
   * When reacting in a guild channel, custom emojis must be from that guild.
   * @param emoji - Emoji string or object
   * @param guildId - Guild ID for resolving custom emoji by name (required when id is missing)
   * @returns API-formatted string for reactions
   */
  async resolveEmoji(
    emoji: string | { name: string; id?: string; animated?: boolean },
    guildId?: string | null,
  ): Promise<string> {
    if (typeof emoji === 'object' && emoji.id) {
      if (guildId) {
        await this.assertEmojiInGuild(emoji.id, guildId);
      }
      return formatEmoji({ name: emoji.name, id: emoji.id as string, animated: emoji.animated });
    }
    const parsed = parseEmoji(
      typeof emoji === 'string' ? emoji : emoji.id ? `:${emoji.name}:` : emoji.name,
    );
    if (!parsed) throw new Error('Invalid emoji');
    if (parsed.id) {
      if (guildId) {
        await this.assertEmojiInGuild(parsed.id, guildId);
      }
      return formatEmoji(parsed);
    }
    // Unicode emoji: name has non-ASCII or isn't a custom shortcode — return raw, route will encode
    if (!/^\w+$/.test(parsed.name)) return parsed.name;
    // Known Unicode shortcode (e.g. :red_square:, :light_blue_heart:) — resolve and return raw unicode
    const unicodeFromShortcode = getUnicodeFromShortcode(parsed.name);
    if (unicodeFromShortcode) return unicodeFromShortcode;
    if (guildId) {
      const emojis = await this.rest.get(Routes.guildEmojis(guildId));
      const list = (Array.isArray(emojis) ? emojis : Object.values(emojis ?? {})) as Array<{
        id: string;
        name?: string;
        animated?: boolean;
      }>;
      const found = list.find((e) => e.name && e.name.toLowerCase() === parsed!.name.toLowerCase());
      if (found) return formatEmoji({ ...parsed, id: found.id, animated: found.animated });
      throw new Error(
        `Custom emoji ":${parsed.name}:" not found in guild. Use name:id or <:name:id> format.`,
      );
    }
    if (/^\w+$/.test(parsed.name)) {
      throw new Error(
        `Custom emoji ":${parsed.name}:" requires guild context. Use message.react() in a guild channel, or pass guildId to client.resolveEmoji().`,
      );
    }
    return parsed.name;
  }

  /**
   * Asserts that a custom emoji (by id) belongs to the given guild.
   * Used when reacting in guild channels to reject emojis from other servers.
   * @throws FluxerError with EMOJI_NOT_IN_GUILD if the emoji is not in the guild
   */
  private async assertEmojiInGuild(emojiId: string, guildId: string): Promise<void> {
    const emojis = await this.rest.get(Routes.guildEmojis(guildId));
    const list = (Array.isArray(emojis) ? emojis : Object.values(emojis ?? {})) as Array<{
      id: string;
    }>;
    const found = list.some((e) => e.id === emojiId);
    if (!found) {
      throw new FluxerError('Custom emoji is from another server. Use an emoji from this server.', {
        code: ErrorCodes.EmojiNotInGuild,
      });
    }
  }

  /**
   * Fetch instance info (API URL, gateway URL, features). GET /instance.
   * Does not require authentication.
   */
  async fetchInstance(): Promise<APIInstance> {
    return this.rest.get<APIInstance>(Routes.instance(), { auth: false });
  }

  /**
   * Fetch a message by channel and message ID. Use when you have IDs (e.g. from a DB).
   * @param channelId - Snowflake of the channel
   * @param messageId - Snowflake of the message
   * @returns The message
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   * @deprecated Use channel.messages.fetch(messageId). For IDs-only: (await client.channels.resolve(channelId))?.messages?.fetch(messageId)
   * @example
   * const channel = await client.channels.resolve(channelId);
   * const message = await channel?.messages?.fetch(messageId);
   */
  async fetchMessage(channelId: string, messageId: string): Promise<Message> {
    emitDeprecationWarning(
      'Client.fetchMessage()',
      'Use channel.messages.fetch(messageId). For IDs-only: (await client.channels.resolve(channelId))?.messages?.fetch(messageId)',
    );
    return this.channels.fetchMessage(channelId, messageId);
  }

  /**
   * Send a message to any channel by ID. Shorthand for client.channels.send().
   * Works even when the channel is not cached.
   */
  async sendToChannel(
    channelId: string,
    payload: string | { content?: string; embeds?: APIEmbed[] },
  ): Promise<Message> {
    return this.channels.send(channelId, payload);
  }

  /**
   * Get or create a User from API data. Caches in client.users.
   * Updates existing user's username, avatar, etc. when fresh data is provided.
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

  /** WebSocket manager. Throws if not logged in. */
  get ws(): WebSocketManager {
    if (!this._ws) throw new Error('Client is not logged in');
    return this._ws;
  }

  /**
   * Send a payload to the gateway (e.g. Voice State Update).
   * @param shardId - Shard ID (use 0 for single-shard)
   * @param payload - Gateway payload to send
   */
  sendToGateway(shardId: number, payload: GatewaySendPayload): void {
    this.ws.send(shardId, payload);
  }

  private async handleDispatch(payload: GatewayReceivePayload): Promise<void> {
    if (payload.op !== 0 || !payload.t) return;
    const { t: event, d } = payload;
    try {
      const handler = eventHandlers.get(event);
      if (handler) await handler(this, d);
    } catch (err) {
      this.emit(Events.Error, err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Connect to the Fluxer gateway and authenticate.
   * @param token - Bot token (e.g. from FLUXER_BOT_TOKEN)
   */
  async login(token: string): Promise<string> {
    if (this._ws) {
      throw new FluxerError('Client is already logged in. Call destroy() first.', {
        code: ErrorCodes.AlreadyLoggedIn,
      });
    }
    this.rest.setToken(token);
    let intents = this.options.intents ?? 0;
    if (intents !== 0) {
      if (!this.options.suppressIntentWarning) {
        if (typeof process !== 'undefined' && process.emitWarning) {
          process.emitWarning('Fluxer does not support intents yet. Value has been set to 0.', {
            type: 'FluxerIntents',
          });
        } else {
          console.warn('Fluxer does not support intents yet. Value has been set to 0.');
        }
      }
      intents = 0;
    }
    this._ws = new WebSocketManager({
      token,
      intents,
      presence: this.options.presence,
      rest: { get: (route: string) => this.rest.get(route) },
      version: this.options.rest?.version ?? '1',
      WebSocket: this.options.WebSocket,
    });
    this._ws.on('dispatch', ({ payload }: { payload: GatewayReceivePayload }) => {
      this.handleDispatch(payload).catch((err: unknown) =>
        this.emit(Events.Error, err instanceof Error ? err : new Error(String(err))),
      );
    });
    this._ws.on(
      'ready',
      async ({
        data,
      }: {
        data: { user: APIUser; guilds: Array<APIGuild & { unavailable?: boolean }> };
      }) => {
        this.user = new ClientUser(this, data.user);
        for (const g of data.guilds ?? []) {
          const guildData = normalizeGuildPayload(g as unknown);
          if (!guildData) continue;
          const guild = new Guild(this, guildData);
          this.guilds.set(guild.id, guild);
          const withCh = g as APIGuild & {
            channels?: APIChannel[];
            voice_states?: Array<{ user_id: string; channel_id: string | null }>;
          };
          for (const ch of withCh.channels ?? []) {
            const channel = Channel.from(this, ch);
            if (channel) {
              this.channels.set(channel.id, channel);
              guild.channels.set(channel.id, channel as GuildChannel);
            }
          }
          if (withCh.voice_states?.length) {
            this.emit(Events.VoiceStatesSync, {
              guildId: guild.id,
              voiceStates: withCh.voice_states,
            });
          }
        }
        this.readyAt = new Date();
        this.emit(Events.Ready);
      },
    );
    this._ws.on('error', ({ error }: { error: Error }) => this.emit(Events.Error, error));
    this._ws.on('debug', (msg: string) => this.emit(Events.Debug, msg));
    await this._ws.connect();
    return token;
  }

  /** Disconnect from the gateway and clear cached data. */
  async destroy(): Promise<void> {
    if (this._ws) {
      this._ws.destroy();
      this._ws = null;
    }
    this.rest.setToken(null);
    this.user = null;
    this.readyAt = null;
    this.guilds.clear();
    this.channels.clear();
    this.users.clear();
  }

  /** Returns true if the client has received Ready and `user` is set. */
  isReady(): this is Client & { user: NonNullable<Client['user']> } {
    return this.readyAt !== null && this.user !== null;
  }

  /**
   * Throws if the client is not ready. Use before accessing client.user or other post-ready state.
   * @throws FluxerError with CLIENT_NOT_READY if client has not received Ready yet
   */
  assertReady(): asserts this is Client & { user: NonNullable<Client['user']> } {
    if (!this.isReady()) {
      throw new FluxerError(
        'Client is not ready yet. Wait for the Ready event before accessing client.user.',
        {
          code: ErrorCodes.ClientNotReady,
        },
      );
    }
  }

  static get Routes(): typeof Routes {
    return Routes;
  }
}
