import { EventEmitter } from 'events';
import { REST } from '@fluxerjs/rest';
import { WebSocketManager } from '@fluxerjs/ws';
import { Routes } from '@fluxerjs/types';
import { Collection } from '@fluxerjs/collection';
import type { ClientOptions } from '../util/Options.js';
import type { ClientUser } from './ClientUser.js';
import type { Guild } from '../structures/Guild.js';
import type { Channel } from '../structures/Channel.js';
import type { User } from '../structures/User.js';
import { Events } from '../util/Events.js';
import type {
  GatewayReceivePayload,
  GatewaySendPayload,
  GatewayVoiceStateUpdateDispatchData,
  GatewayVoiceServerUpdateDispatchData,
  GatewayMessageReactionAddDispatchData,
  GatewayMessageReactionRemoveDispatchData,
  GatewayMessageReactionRemoveEmojiDispatchData,
  GatewayMessageReactionRemoveAllDispatchData,
} from '@fluxerjs/types';
import type { APIMessage, APIChannel, APIGuild, APIUser, APIGuildMember, APIApplicationCommandInteraction } from '@fluxerjs/types';

export interface ClientEvents {
  [Events.Ready]: [];
  [Events.MessageCreate]: [message: import('../structures/Message.js').Message];
  [Events.MessageUpdate]: [oldMessage: import('../structures/Message.js').Message | null, newMessage: import('../structures/Message.js').Message];
  [Events.MessageDelete]: [message: import('../structures/Message.js').Message | { id: string; channelId: string }];
  [Events.MessageReactionAdd]: [data: GatewayMessageReactionAddDispatchData];
  [Events.MessageReactionRemove]: [data: GatewayMessageReactionRemoveDispatchData];
  [Events.MessageReactionRemoveAll]: [data: GatewayMessageReactionRemoveAllDispatchData];
  [Events.MessageReactionRemoveEmoji]: [data: GatewayMessageReactionRemoveEmojiDispatchData];
  [Events.InteractionCreate]: [interaction: import('@fluxerjs/types').APIApplicationCommandInteraction];
  [Events.GuildCreate]: [guild: Guild];
  [Events.GuildUpdate]: [oldGuild: Guild, newGuild: Guild];
  [Events.GuildDelete]: [guild: Guild];
  [Events.ChannelCreate]: [channel: import('../structures/Channel.js').GuildChannel];
  [Events.ChannelUpdate]: [oldChannel: Channel, newChannel: Channel];
  [Events.ChannelDelete]: [channel: Channel];
  [Events.GuildMemberAdd]: [member: import('../structures/GuildMember.js').GuildMember];
  [Events.GuildMemberUpdate]: [oldMember: import('../structures/GuildMember.js').GuildMember, newMember: import('../structures/GuildMember.js').GuildMember];
  [Events.GuildMemberRemove]: [member: import('../structures/GuildMember.js').GuildMember];
  [Events.VoiceStateUpdate]: [data: GatewayVoiceStateUpdateDispatchData];
  [Events.VoiceServerUpdate]: [data: GatewayVoiceServerUpdateDispatchData];
  [Events.VoiceStatesSync]: [data: { guildId: string; voiceStates: Array<{ user_id: string; channel_id: string | null }> }];
  [Events.Error]: [error: Error];
  [Events.Debug]: [message: string];
}

/** Main Fluxer bot client. Connects to the gateway, emits events, and provides REST access. */
export class Client extends EventEmitter {
  readonly rest: REST;
  readonly guilds = new Collection<string, Guild>();
  readonly channels = new Collection<string, Channel>();
  readonly users = new Collection<string, User>();
  user: ClientUser | null = null;
  readyAt: Date | null = null;
  private _ws: WebSocketManager | null = null;

  /** @param options - Token, REST config, WebSocket, presence, etc. */
  constructor(public readonly options: ClientOptions = {}) {
    super();
    this.rest = new REST({
      api: options.rest?.api ?? 'https://api.fluxer.app',
      version: options.rest?.version ?? '1',
      ...options.rest,
    });
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
      switch (event) {
        case 'MESSAGE_CREATE': {
          const { Message } = await import('../structures/Message.js');
          this.emit(Events.MessageCreate, new Message(this, d as APIMessage));
          break;
        }
        case 'MESSAGE_UPDATE': {
          const { Message } = await import('../structures/Message.js');
          this.emit(Events.MessageUpdate, null, new Message(this, d as APIMessage));
          break;
        }
        case 'MESSAGE_DELETE':
          this.emit(Events.MessageDelete, { id: (d as { id: string }).id, channelId: (d as { channel_id: string }).channel_id });
          break;
        case 'MESSAGE_REACTION_ADD':
          this.emit(Events.MessageReactionAdd, d as GatewayMessageReactionAddDispatchData);
          break;
        case 'MESSAGE_REACTION_REMOVE':
          this.emit(Events.MessageReactionRemove, d as GatewayMessageReactionRemoveDispatchData);
          break;
        case 'MESSAGE_REACTION_REMOVE_ALL':
          this.emit(Events.MessageReactionRemoveAll, d as GatewayMessageReactionRemoveAllDispatchData);
          break;
        case 'MESSAGE_REACTION_REMOVE_EMOJI':
          this.emit(Events.MessageReactionRemoveEmoji, d as GatewayMessageReactionRemoveEmojiDispatchData);
          break;
        case 'GUILD_CREATE': {
          const { Guild } = await import('../structures/Guild.js');
          const { Channel } = await import('../structures/Channel.js');
          const guild = new Guild(this, d as APIGuild);
          this.guilds.set(guild.id, guild);
          const g = d as APIGuild & { channels?: APIChannel[]; voice_states?: Array<{ user_id: string; channel_id: string | null }> };
          for (const ch of g.channels ?? []) {
            const channel = Channel.from(this, ch);
            if (channel) this.channels.set(channel.id, channel);
          }
          this.emit(Events.GuildCreate, guild);
          if (g.voice_states?.length) {
            this.emit(Events.VoiceStatesSync, { guildId: guild.id, voiceStates: g.voice_states });
          }
          break;
        }
        case 'GUILD_UPDATE': {
          const { Guild } = await import('../structures/Guild.js');
          const g = d as APIGuild;
          const old = this.guilds.get(g.id);
          const updated = new Guild(this, g);
          this.guilds.set(updated.id, updated);
          this.emit(Events.GuildUpdate, old ?? updated, updated);
          break;
        }
        case 'GUILD_DELETE': {
          const g = d as { id: string };
          const guild = this.guilds.get(g.id);
          if (guild) {
            this.guilds.delete(g.id);
            this.emit(Events.GuildDelete, guild);
          }
          break;
        }
        case 'CHANNEL_CREATE': {
          const { Channel } = await import('../structures/Channel.js');
          const ch = Channel.from(this, d as APIChannel);
          if (ch) {
            this.channels.set(ch.id, ch);
            this.emit(Events.ChannelCreate, ch as import('../structures/Channel.js').GuildChannel);
          }
          break;
        }
        case 'CHANNEL_UPDATE': {
          const { Channel } = await import('../structures/Channel.js');
          const ch = d as APIChannel;
          const oldCh = this.channels.get(ch.id);
          const newCh = Channel.from(this, ch);
          if (newCh) {
            this.channels.set(newCh.id, newCh);
            this.emit(Events.ChannelUpdate, oldCh ?? newCh, newCh);
          }
          break;
        }
        case 'CHANNEL_DELETE': {
          const ch = d as { id: string };
          const channel = this.channels.get(ch.id);
          if (channel) {
            this.channels.delete(ch.id);
            this.emit(Events.ChannelDelete, channel);
          }
          break;
        }
        case 'GUILD_MEMBER_ADD': {
          const { GuildMember } = await import('../structures/GuildMember.js');
          const data = d as APIGuildMember & { guild_id: string };
          const guild = this.guilds.get(data.guild_id);
          if (guild) {
            const member = new GuildMember(this, data, guild);
            guild.members.set(member.id, member);
            this.emit(Events.GuildMemberAdd, member);
          }
          break;
        }
        case 'GUILD_MEMBER_UPDATE': {
          const { GuildMember } = await import('../structures/GuildMember.js');
          const data = d as APIGuildMember & { guild_id: string };
          const guild = this.guilds.get(data.guild_id);
          if (guild) {
            const oldM = guild.members.get(data.user.id);
            const newM = new GuildMember(this, data, guild);
            guild.members.set(newM.id, newM);
            this.emit(Events.GuildMemberUpdate, oldM ?? newM, newM);
          }
          break;
        }
        case 'GUILD_MEMBER_REMOVE': {
          const data = d as { guild_id: string; user: APIUser };
          const guild = this.guilds.get(data.guild_id);
          if (guild) {
            const member = guild.members.get(data.user.id);
            if (member) {
              guild.members.delete(data.user.id);
              this.emit(Events.GuildMemberRemove, member);
            }
          }
          break;
        }
        case 'INTERACTION_CREATE': {
          this.emit(Events.InteractionCreate, d as APIApplicationCommandInteraction);
          break;
        }
        case 'VOICE_STATE_UPDATE': {
          this.emit(Events.VoiceStateUpdate, d as GatewayVoiceStateUpdateDispatchData);
          break;
        }
        case 'VOICE_SERVER_UPDATE': {
          this.emit(Events.VoiceServerUpdate, d as GatewayVoiceServerUpdateDispatchData);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      this.emit(Events.Error, err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Connect to the Fluxer gateway and authenticate.
   * @param token - Bot token (e.g. from FLUXER_BOT_TOKEN)
   */
  async login(token: string): Promise<string> {
    this.rest.setToken(token);
    let intents = this.options.intents ?? 0;
    if (intents !== 0) {
      if (typeof process !== 'undefined' && process.emitWarning) {
        process.emitWarning(
          'Fluxer does not support intents yet. Value has been set to 0.',
          { type: 'FluxerIntents' },
        );
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
      this.handleDispatch(payload);
    });
    this._ws.on('ready', async ({ data }: { data: { user: APIUser; guilds: Array<APIGuild & { unavailable?: boolean }> } }) => {
      const { ClientUser } = await import('./ClientUser.js');
      const { Guild } = await import('../structures/Guild.js');
      const { Channel } = await import('../structures/Channel.js');
      this.user = new ClientUser(this, data.user);
      for (const g of data.guilds ?? []) {
        const guild = new Guild(this, g);
        this.guilds.set(guild.id, guild);
        const withCh = g as APIGuild & { channels?: APIChannel[]; voice_states?: Array<{ user_id: string; channel_id: string | null }> };
        for (const ch of withCh.channels ?? []) {
          const channel = Channel.from(this, ch);
          if (channel) this.channels.set(channel.id, channel);
        }
        if (withCh.voice_states?.length) {
          this.emit(Events.VoiceStatesSync, { guildId: guild.id, voiceStates: withCh.voice_states });
        }
      }
      this.readyAt = new Date();
      this.emit(Events.Ready);
    });
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
