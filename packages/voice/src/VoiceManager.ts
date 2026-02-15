import { EventEmitter } from 'events';
import type { Client } from '@fluxerjs/core';
import type { VoiceChannel } from '@fluxerjs/core';
import { Events } from '@fluxerjs/core';
import { GatewayOpcodes, Routes } from '@fluxerjs/types';
import { thumbnail } from './streamPreviewPlaceholder.js';
import type {
  GatewayVoiceServerUpdateDispatchData,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import { VoiceConnection } from './VoiceConnection.js';
import { LiveKitRtcConnection } from './LiveKitRtcConnection.js';
import { isLiveKitEndpoint } from './livekit.js';
import { Collection } from '@fluxerjs/collection';

/** Maps guild_id -> user_id -> channel_id (null if not in voice). */
export type VoiceStateMap = Map<string, Map<string, string | null>>;

/**
 * Options for creating a VoiceManager.
 *
 * @property shardId - Gateway shard ID to use for voice connections (default 0).
 *   Use when the client runs multiple shards and you need to target a specific one.
 */
export interface VoiceManagerOptions {
  /** Gateway shard ID to use for voice (default 0). */
  shardId?: number;
}

/** Manages voice connections. Use `getVoiceManager(client)` to obtain an instance. */
export class VoiceManager extends EventEmitter {
  readonly client: Client;
  private readonly connections = new Collection<string, VoiceConnection | LiveKitRtcConnection>();
  /** guild_id -> connection_id (from VoiceServerUpdate; required for voice state updates when in channel) */
  private readonly connectionIds = new Map<string, string>();
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
    this.client.on(Events.VoiceStateUpdate, (data: GatewayVoiceStateUpdateDispatchData) =>
      this.handleVoiceStateUpdate(data)
    );
    this.client.on(Events.VoiceServerUpdate, (data: GatewayVoiceServerUpdateDispatchData) =>
      this.handleVoiceServerUpdate(data)
    );
    this.client.on(
      Events.VoiceStatesSync,
      (data: {
        guildId: string;
        voiceStates: Array<{ user_id: string; channel_id: string | null }>;
      }) => this.handleVoiceStatesSync(data)
    );
  }

  private handleVoiceStatesSync(data: {
    guildId: string;
    voiceStates: Array<{ user_id: string; channel_id: string | null }>;
  }): void {
    let guildMap = this.voiceStates.get(data.guildId);
    if (!guildMap) {
      guildMap = new Map();
      this.voiceStates.set(data.guildId, guildMap);
    }
    for (const vs of data.voiceStates) {
      guildMap.set(vs.user_id, vs.channel_id);
    }
  }

  /**
   * Get the voice channel ID the user is currently in, or null if not in voice.
   * @param guildId - Guild ID to look up
   * @param userId - User ID to look up
   */
  getVoiceChannelId(guildId: string, userId: string): string | null {
    const guildMap = this.voiceStates.get(guildId);
    if (!guildMap) return null;
    return guildMap.get(userId) ?? null;
  }

  private handleVoiceStateUpdate(data: GatewayVoiceStateUpdateDispatchData): void {
    const guildId = data.guild_id ?? '';
    if (!guildId) return;
    this.client.emit?.(
      'debug',
      `[VoiceManager] VoiceStateUpdate guild=${guildId} user=${data.user_id} channel=${data.channel_id ?? 'null'} (bot=${this.client.user?.id})`
    );
    let guildMap = this.voiceStates.get(guildId);
    if (!guildMap) {
      guildMap = new Map();
      this.voiceStates.set(guildId, guildMap);
    }
    guildMap.set(data.user_id, data.channel_id);

    const pending = this.pending.get(guildId);
    const isBot = String(data.user_id) === String(this.client.user?.id);
    if (isBot && data.connection_id) {
      this.storeConnectionId(guildId, data.connection_id);
    }
    if (pending && isBot) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] VoiceStateUpdate for bot - completing pending guild ${guildId}`
      );
      pending.state = data;
      this.tryCompletePending(guildId);
    }
  }

  private handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatchData): void {
    const guildId = data.guild_id;

    const pending = this.pending.get(guildId);
    if (pending) {
      const hasToken = !!(data.token && data.token.length > 0);
      this.client.emit?.(
        'debug',
        `[VoiceManager] VoiceServerUpdate guild=${guildId} endpoint=${data.endpoint ?? 'null'} token=${hasToken ? 'yes' : 'NO'}`
      );
      pending.server = data;
      this.tryCompletePending(guildId);
      return;
    }

    const userId = this.client.user?.id;
    if (!userId) {
      this.client.emit?.(
        'debug',
        '[VoiceManager] Client user not available. Ensure the client is logged in.'
      );
      return;
    }

    const conn = this.connections.get(guildId);
    if (!conn) return;

    if (!data.endpoint || !data.token) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Voice server endpoint null for guild ${guildId}; disconnecting until new allocation`
      );
      conn.destroy();
      this.connections.delete(guildId);
      return;
    }

    if (!isLiveKitEndpoint(data.endpoint, data.token)) return;

    if (conn instanceof LiveKitRtcConnection && conn.isSameServer(data.endpoint, data.token)) {
      return;
    }

    const channel = conn.channel;
    this.client.emit?.(
      'debug',
      `[VoiceManager] Voice server migration for guild ${guildId}; reconnecting`
    );
    conn.destroy();
    this.connections.delete(guildId);
    this.storeConnectionId(guildId, data.connection_id);

    const ConnClass = LiveKitRtcConnection;
    const newConn = new ConnClass(this.client, channel, userId);
    this.registerConnection(guildId, newConn);

    const state: GatewayVoiceStateUpdateDispatchData = {
      guild_id: guildId,
      channel_id: channel.id,
      user_id: userId,
      session_id: '',
    };

    newConn.connect(data, state).catch((e) => {
      this.connections.delete(guildId);
      newConn.emit('error', e instanceof Error ? e : new Error(String(e)));
    });
  }

  private storeConnectionId(guildId: string, connectionId: string | null | undefined): void {
    const id = connectionId != null ? String(connectionId) : null;
    if (id) this.connectionIds.set(guildId, id);
    else this.connectionIds.delete(guildId);
  }

  private registerConnection(guildId: string, conn: VoiceConnection | LiveKitRtcConnection): void {
    this.connections.set(guildId, conn);
    conn.once('disconnect', () => {
      this.connections.delete(guildId);
      this.connectionIds.delete(guildId);
    });
    conn.on('requestVoiceStateSync', (p: { self_stream?: boolean; self_video?: boolean }) => {
      this.updateVoiceState(guildId, p);
      if (p.self_stream) {
        this.uploadStreamPreview(guildId, conn).catch((e) =>
          this.client.emit?.('debug', `[VoiceManager] Stream preview upload failed: ${String(e)}`)
        );
      }
    });
  }

  /** Upload a placeholder stream preview so the preview URL returns 200 instead of 404. */
  private async uploadStreamPreview(
    guildId: string,
    conn: VoiceConnection | LiveKitRtcConnection
  ): Promise<void> {
    const connectionId = this.connectionIds.get(guildId);
    if (!connectionId) return;

    const streamKey = `${guildId}:${conn.channel.id}:${connectionId}`;
    const route = Routes.streamPreview(streamKey);
    const body = { channel_id: conn.channel.id, thumbnail, content_type: 'image/png' };

    await this.client.rest.post(route, { body, auth: true });
    this.client.emit?.('debug', `[VoiceManager] Uploaded stream preview for ${streamKey}`);
  }

  private tryCompletePending(guildId: string): void {
    const pending = this.pending.get(guildId);
    if (!pending?.server) return;

    const useLiveKit = isLiveKitEndpoint(pending.server.endpoint, pending.server.token);
    const hasState = !!pending.state;

    if (!useLiveKit && !hasState) return;
    if (useLiveKit && !hasState) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Proceeding with VoiceServerUpdate only (LiveKit does not require VoiceStateUpdate)`
      );
    }

    const userId = this.client.user?.id;
    if (!userId) {
      this.client.emit?.(
        'debug',
        '[VoiceManager] Client user not available. Ensure the client is logged in.'
      );
      return;
    }

    const state: GatewayVoiceStateUpdateDispatchData = pending.state ?? {
      guild_id: guildId,
      channel_id: pending.channel.id,
      user_id: userId,
      session_id: '',
    };

    this.storeConnectionId(
      guildId,
      pending.server.connection_id ?? (state as { connection_id?: string }).connection_id
    );
    this.pending.delete(guildId);
    const ConnClass = useLiveKit ? LiveKitRtcConnection : VoiceConnection;
    const conn = new ConnClass(this.client, pending.channel, userId);
    this.registerConnection(guildId, conn);
    conn.connect(pending.server, state).then(
      () => pending.resolve(conn),
      (e) => pending.reject(e)
    );
  }

  /**
   * Join a voice channel. Resolves when the connection is ready.
   * @param channel - The voice channel to join
   * @returns The voice connection (LiveKitRtcConnection when Fluxer uses LiveKit)
   */
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
      this.client.emit?.(
        'debug',
        `[VoiceManager] Requesting voice join guild=${channel.guildId} channel=${channel.id}`
      );
      const timeout = setTimeout(() => {
        if (this.pending.has(channel.guildId)) {
          this.pending.delete(channel.guildId);
          reject(
            new Error(
              'Voice connection timeout. Ensure the server has voice enabled and the bot has Connect permissions. ' +
                'The gateway must send VoiceServerUpdate and VoiceStateUpdate in response.'
            )
          );
        }
      }, 20_000);
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

  /**
   * Leave a guild's voice channel and disconnect.
   * @param guildId - Guild ID to leave
   */
  leave(guildId: string): void {
    const conn = this.connections.get(guildId);
    if (conn) {
      conn.destroy();
      this.connections.delete(guildId);
      this.connectionIds.delete(guildId);
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

  /**
   * Get the active voice connection for a guild, if any.
   * @param guildId - Guild ID to look up
   */
  getConnection(guildId: string): VoiceConnection | LiveKitRtcConnection | undefined {
    return this.connections.get(guildId);
  }

  /**
   * Update voice state (e.g. self_stream, self_video) while in a channel.
   * Sends a VoiceStateUpdate to the gateway so the server and clients see the change.
   * Requires connection_id (from VoiceServerUpdate); without it, the gateway would treat
   * the update as a new join and trigger a new VoiceServerUpdate, causing connection loops.
   * @param guildId - Guild ID
   * @param partial - Partial voice state to update (self_stream, self_video, self_mute, self_deaf)
   */
  updateVoiceState(
    guildId: string,
    partial: {
      self_stream?: boolean;
      self_video?: boolean;
      self_mute?: boolean;
      self_deaf?: boolean;
    }
  ): void {
    const conn = this.connections.get(guildId);
    if (!conn) return;

    const connectionId = this.connectionIds.get(guildId);
    if (!connectionId) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Skipping voice state sync: no connection_id for guild ${guildId}`
      );
      return;
    }

    this.client.sendToGateway(this.shardId, {
      op: GatewayOpcodes.VoiceStateUpdate,
      d: {
        guild_id: guildId,
        channel_id: conn.channel.id,
        connection_id: connectionId,
        self_mute: partial.self_mute ?? false,
        self_deaf: partial.self_deaf ?? false,
        self_video: partial.self_video ?? false,
        self_stream: partial.self_stream ?? false,
      },
    });
  }
}
