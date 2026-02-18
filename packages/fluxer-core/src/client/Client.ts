import { EventEmitter } from 'events';
import { REST } from '@fluxerjs/rest';
import { WebSocketManager } from '@fluxerjs/ws';
import { Routes } from '@fluxerjs/types';
import { ChannelManager } from './ChannelManager.js';
import { GuildManager } from './GuildManager.js';
import type { ClientOptions } from '../util/Options.js';
import type { ClientUser } from './ClientUser.js';
import type { Guild } from '../structures/Guild.js';
import type { Channel } from '../structures/Channel.js';
import { FluxerError } from '../errors/FluxerError.js';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { Events } from '../util/Events.js';
import type {
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
import type { APIChannel, APIGuild, APIRole, APIUser, APIUserPartial } from '@fluxerjs/types';
import { emitDeprecationWarning, formatEmoji, parseEmoji } from '@fluxerjs/util';
import { User } from '../structures/User.js';
import { UsersManager } from './UsersManager.js';
import { eventHandlers } from './EventHandlerRegistry.js';

/**
 * Callback parameter types for client events. Use with client.on(Events.X, handler).
 * @see Events
 */
export interface ClientEvents {
  [Events.Ready]: [];
  [Events.MessageCreate]: [message: import('../structures/Message.js').Message];
  [Events.MessageUpdate]: [
    oldMessage: import('../structures/Message.js').Message | null,
    newMessage: import('../structures/Message.js').Message,
  ];
  [Events.MessageDelete]: [message: import('../structures/PartialMessage.js').PartialMessage];
  [Events.MessageReactionAdd]: [
    reaction: import('../structures/MessageReaction.js').MessageReaction,
    user: User,
    messageId: string,
    channelId: string,
    emoji: GatewayReactionEmoji,
    userId: string,
  ];
  [Events.MessageReactionRemove]: [
    reaction: import('../structures/MessageReaction.js').MessageReaction,
    user: User,
    messageId: string,
    channelId: string,
    emoji: GatewayReactionEmoji,
    userId: string,
  ];
  [Events.MessageReactionRemoveAll]: [data: GatewayMessageReactionRemoveAllDispatchData];
  [Events.MessageReactionRemoveEmoji]: [data: GatewayMessageReactionRemoveEmojiDispatchData];
  [Events.InteractionCreate]: [
    interaction: import('@fluxerjs/types').APIApplicationCommandInteraction,
  ];
  [Events.GuildCreate]: [guild: Guild];
  [Events.GuildUpdate]: [oldGuild: Guild, newGuild: Guild];
  [Events.GuildDelete]: [guild: Guild];
  [Events.ChannelCreate]: [channel: import('../structures/Channel.js').GuildChannel];
  [Events.ChannelUpdate]: [oldChannel: Channel, newChannel: Channel];
  [Events.ChannelDelete]: [channel: Channel];
  [Events.GuildMemberAdd]: [member: import('../structures/GuildMember.js').GuildMember];
  [Events.GuildMemberUpdate]: [
    oldMember: import('../structures/GuildMember.js').GuildMember,
    newMember: import('../structures/GuildMember.js').GuildMember,
  ];
  [Events.GuildMemberRemove]: [member: import('../structures/GuildMember.js').GuildMember];
  [Events.VoiceStateUpdate]: [data: GatewayVoiceStateUpdateDispatchData];
  [Events.VoiceServerUpdate]: [data: GatewayVoiceServerUpdateDispatchData];
  [Events.VoiceStatesSync]: [
    data: { guildId: string; voiceStates: Array<{ user_id: string; channel_id: string | null }> },
  ];
  [Events.MessageDeleteBulk]: [
    data: import('@fluxerjs/types').GatewayMessageDeleteBulkDispatchData,
  ];
  [Events.GuildBanAdd]: [ban: import('../structures/GuildBan.js').GuildBan];
  [Events.GuildBanRemove]: [ban: import('../structures/GuildBan.js').GuildBan];
  [Events.GuildEmojisUpdate]: [data: GatewayGuildEmojisUpdateDispatchData];
  [Events.GuildStickersUpdate]: [data: GatewayGuildStickersUpdateDispatchData];
  [Events.GuildIntegrationsUpdate]: [data: GatewayGuildIntegrationsUpdateDispatchData];
  [Events.GuildRoleCreate]: [data: import('@fluxerjs/types').GatewayGuildRoleCreateDispatchData];
  [Events.GuildRoleUpdate]: [data: import('@fluxerjs/types').GatewayGuildRoleUpdateDispatchData];
  [Events.GuildRoleDelete]: [data: import('@fluxerjs/types').GatewayGuildRoleDeleteDispatchData];
  [Events.GuildScheduledEventCreate]: [data: GatewayGuildScheduledEventCreateDispatchData];
  [Events.GuildScheduledEventUpdate]: [data: GatewayGuildScheduledEventUpdateDispatchData];
  [Events.GuildScheduledEventDelete]: [data: GatewayGuildScheduledEventDeleteDispatchData];
  [Events.ChannelPinsUpdate]: [data: GatewayChannelPinsUpdateDispatchData];
  [Events.InviteCreate]: [invite: import('../structures/Invite.js').Invite];
  [Events.InviteDelete]: [data: import('@fluxerjs/types').GatewayInviteDeleteDispatchData];
  [Events.TypingStart]: [data: import('@fluxerjs/types').GatewayTypingStartDispatchData];
  [Events.UserUpdate]: [data: import('@fluxerjs/types').GatewayUserUpdateDispatchData];
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
   * @param emoji - Emoji string or object
   * @param guildId - Guild ID for resolving custom emoji by name (required when id is missing)
   * @returns API-formatted string for reactions
   */
  async resolveEmoji(
    emoji: string | { name: string; id?: string; animated?: boolean },
    guildId?: string | null,
  ): Promise<string> {
    if (typeof emoji === 'object' && emoji.id) {
      return formatEmoji({ name: emoji.name, id: emoji.id as string, animated: emoji.animated });
    }
    const parsed = parseEmoji(
      typeof emoji === 'string' ? emoji : emoji.id ? `:${emoji.name}:` : emoji.name,
    );
    if (!parsed) throw new Error('Invalid emoji');
    if (parsed.id) return formatEmoji(parsed);
    // Unicode emoji: name has non-ASCII or isn't a custom shortcode — return encoded, skip guild lookup
    if (!/^\w+$/.test(parsed.name)) return encodeURIComponent(parsed.name);
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
    return encodeURIComponent(parsed.name);
  }

  /**
   * Fetch a message by channel and message ID. Use when you have IDs (e.g. from a DB).
   * @param channelId - Snowflake of the channel
   * @param messageId - Snowflake of the message
   * @returns The message
   * @throws FluxerError with MESSAGE_NOT_FOUND if the message does not exist
   * @deprecated Use channel.messages.fetch(messageId). For IDs-only: (await client.channels.fetch(channelId))?.messages?.fetch(messageId)
   * @example
   * const channel = await client.channels.fetch(channelId);
   * const message = await channel?.messages?.fetch(messageId);
   */
  async fetchMessage(
    channelId: string,
    messageId: string,
  ): Promise<import('../structures/Message.js').Message> {
    emitDeprecationWarning(
      'Client.fetchMessage()',
      'Use channel.messages.fetch(messageId). For IDs-only: (await client.channels.fetch(channelId))?.messages?.fetch(messageId)',
    );
    return this.channels.fetchMessage(channelId, messageId);
  }

  /**
   * Send a message to any channel by ID. Shorthand for client.channels.send().
   * Works even when the channel is not cached.
   */
  async sendToChannel(
    channelId: string,
    payload: string | { content?: string; embeds?: import('@fluxerjs/types').APIEmbed[] },
  ): Promise<import('../structures/Message.js').Message> {
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
      if (typeof process !== 'undefined' && process.emitWarning) {
        process.emitWarning('Fluxer does not support intents yet. Value has been set to 0.', {
          type: 'FluxerIntents',
        });
      } else {
        console.warn('Fluxer does not support intents yet. Value has been set to 0.');
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
        const { ClientUser } = await import('./ClientUser.js');
        const { Guild } = await import('../structures/Guild.js');
        const { Channel } = await import('../structures/Channel.js');
        this.user = new ClientUser(this, data.user);
        for (const g of data.guilds ?? []) {
          // Fluxer gateway sends GuildReadyData: { id, properties: { owner_id, ... }, channels, roles }
          // Normalize to APIGuild shape so owner_id is available for permission checks
          const guildData: APIGuild & { roles?: APIRole[] } =
            g && typeof g === 'object' && 'properties' in g && g.properties
              ? ({
                  ...(g.properties as Record<string, unknown>),
                  roles: (g as { roles?: APIRole[] }).roles,
                } as APIGuild & { roles?: APIRole[] })
              : (g as APIGuild);
          const guild = new Guild(this, guildData);
          this.guilds.set(guild.id, guild);
          const withCh = g as APIGuild & {
            channels?: APIChannel[];
            voice_states?: Array<{ user_id: string; channel_id: string | null }>;
          };
          for (const ch of withCh.channels ?? []) {
            const channel = Channel.from(this, ch);
            if (channel) this.channels.set(channel.id, channel);
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

  static get Routes(): typeof Routes {
    return Routes;
  }
}
