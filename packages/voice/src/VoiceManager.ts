import { EventEmitter } from 'events';
import type { Client } from '@fluxerjs/core';
import type { VoiceChannel } from '@fluxerjs/core';
import { Events } from '@fluxerjs/core';
import { GatewayOpcodes } from '@fluxerjs/types';
import type { GatewayVoiceServerUpdateDispatchData, GatewayVoiceStateUpdateDispatchData } from '@fluxerjs/types';
import { VoiceConnection } from './VoiceConnection.js';
import { LiveKitRtcConnection } from './LiveKitRtcConnection.js';
import { isLiveKitEndpoint } from './livekit.js';
import { Collection } from '@fluxerjs/collection';

/** Maps guild_id -> user_id -> channel_id (null if not in voice). */
export type VoiceStateMap = Map<string, Map<string, string | null>>;

export interface VoiceManagerOptions {
  /** Gateway shard ID to use for voice (default 0). */
  shardId?: number;
}

export class VoiceManager extends EventEmitter {
  readonly client: Client;
  private readonly connections = new Collection<string, VoiceConnection | LiveKitRtcConnection>();
  /** guild_id -> user_id -> channel_id */
  readonly voiceStates: VoiceStateMap = new Map();
  private readonly pending = new Map<
    string,
    {
      channel: VoiceChannel;
      resolve: (c: VoiceConnection | LiveKitRtcConnection) => void;
      reject: (e: Error) => void;
      server?: GatewayVoiceServerUpdateDispatchData;
      state?: GatewayVoiceStateUpdateDispatchData;
    }
  >();
  private readonly shardId: number;

  constructor(client: Client, options: VoiceManagerOptions = {}) {
    super();
    this.client = client;
    this.shardId = options.shardId ?? 0;
    this.client.on(Events.VoiceStateUpdate, (data: GatewayVoiceStateUpdateDispatchData) => this.handleVoiceStateUpdate(data));
    this.client.on(Events.VoiceServerUpdate, (data: GatewayVoiceServerUpdateDispatchData) => this.handleVoiceServerUpdate(data));
    this.client.on(Events.VoiceStatesSync, (data: { guildId: string; voiceStates: Array<{ user_id: string; channel_id: string | null }> }) => this.handleVoiceStatesSync(data));
  }

  private handleVoiceStatesSync(data: { guildId: string; voiceStates: Array<{ user_id: string; channel_id: string | null }> }): void {
    let guildMap = this.voiceStates.get(data.guildId);
    if (!guildMap) {
      guildMap = new Map();
      this.voiceStates.set(data.guildId, guildMap);
    }
    for (const vs of data.voiceStates) {
      guildMap.set(vs.user_id, vs.channel_id);
    }
  }

  /** Get the voice channel ID the user is in, or null. */
  getVoiceChannelId(guildId: string, userId: string): string | null {
    const guildMap = this.voiceStates.get(guildId);
    if (!guildMap) return null;
    return guildMap.get(userId) ?? null;
  }

  private handleVoiceStateUpdate(data: GatewayVoiceStateUpdateDispatchData): void {
    const guildId = data.guild_id ?? '';
    if (!guildId) return;
    let guildMap = this.voiceStates.get(guildId);
    if (!guildMap) {
      guildMap = new Map();
      this.voiceStates.set(guildId, guildMap);
    }
    guildMap.set(data.user_id, data.channel_id);

    const pending = this.pending.get(guildId);
    if (pending && data.user_id === this.client.user?.id) {
      pending.state = data;
      this.tryCompletePending(guildId);
    }
  }

  private handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatchData): void {
    const guildId = data.guild_id;

    const pending = this.pending.get(guildId);
    if (pending) {
      pending.server = data;
      this.tryCompletePending(guildId);
      return;
    }

    const conn = this.connections.get(guildId);
    if (!conn) return;

    if (!data.endpoint || !data.token) {
      this.client.emit?.('debug', `[VoiceManager] Voice server endpoint null for guild ${guildId}; disconnecting until new allocation`);
      conn.destroy();
      this.connections.delete(guildId);
      return;
    }

    if (!isLiveKitEndpoint(data.endpoint, data.token)) return;

    if (conn instanceof LiveKitRtcConnection && conn.isSameServer(data.endpoint, data.token)) {
      return;
    }

    const channel = conn.channel;
    this.client.emit?.('debug', `[VoiceManager] Voice server migration for guild ${guildId}; reconnecting`);
    conn.destroy();
    this.connections.delete(guildId);

    const ConnClass = LiveKitRtcConnection;
    const newConn = new ConnClass(this.client, channel, this.client.user!.id);
    this.registerConnection(guildId, newConn);

    const state: GatewayVoiceStateUpdateDispatchData = {
      guild_id: guildId,
      channel_id: channel.id,
      user_id: this.client.user!.id,
      session_id: '',
    };

    newConn.connect(data, state).catch((e) => {
      this.connections.delete(guildId);
      newConn.emit('error', e instanceof Error ? e : new Error(String(e)));
    });
  }

  private registerConnection(guildId: string, conn: VoiceConnection | LiveKitRtcConnection): void {
    this.connections.set(guildId, conn);
    conn.once('disconnect', () => this.connections.delete(guildId));
  }

  private tryCompletePending(guildId: string): void {
    const pending = this.pending.get(guildId);
    if (!pending?.server || !pending.state) return;
    this.pending.delete(guildId);
    const ConnClass = isLiveKitEndpoint(pending.server.endpoint, pending.server.token) ? LiveKitRtcConnection : VoiceConnection;
    const conn = new ConnClass(this.client, pending.channel, this.client.user!.id);
    this.registerConnection(guildId, conn);
    conn.connect(pending.server, pending.state).then(
      () => pending.resolve(conn),
      (e) => pending.reject(e)
    );
  }

  /** Join a voice channel. Resolves when the connection is ready. */
  async join(channel: VoiceChannel): Promise<VoiceConnection | LiveKitRtcConnection> {
    const existing = this.connections.get(channel.guildId);
    if (existing) {
      const isReusable =
        existing.channel.id === channel.id &&
        (existing instanceof LiveKitRtcConnection ? existing.isConnected() : true);
      if (isReusable) return existing;
      existing.destroy();
      this.connections.delete(channel.guildId);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pending.has(channel.guildId)) {
          this.pending.delete(channel.guildId);
          reject(new Error('Voice connection timeout'));
        }
      }, 15_000);
      this.pending.set(channel.guildId, {
        channel,
        resolve: (c) => {
          clearTimeout(timeout);
          resolve(c);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      this.client.sendToGateway(this.shardId, {
        op: GatewayOpcodes.VoiceStateUpdate,
        d: {
          guild_id: channel.guildId,
          channel_id: channel.id,
          self_mute: false,
          self_deaf: false,
        },
      });
    });
  }

  /** Leave a guild's voice channel. */
  leave(guildId: string): void {
    const conn = this.connections.get(guildId);
    if (conn) {
      conn.destroy();
      this.connections.delete(guildId);
    }
    this.client.sendToGateway(this.shardId, {
      op: GatewayOpcodes.VoiceStateUpdate,
      d: {
        guild_id: guildId,
        channel_id: null,
        self_mute: false,
        self_deaf: false,
      },
    });
  }

  getConnection(guildId: string): VoiceConnection | LiveKitRtcConnection | undefined {
    return this.connections.get(guildId);
  }
}
