import { EventEmitter } from 'events';
import { Client } from '@fluxerjs/core';
import { VoiceChannel } from '@fluxerjs/core';
import { Events } from '@fluxerjs/core';
import { GatewayOpcodes, Routes } from '@fluxerjs/types';
import { thumbnail } from './streamPreviewPlaceholder.js';
import {
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
  /** channel_id -> connection (Fluxer multi-channel: allows multiple connections per guild) */
  private readonly connections = new Collection<string, VoiceConnection | LiveKitRtcConnection>();
  /** channel_id -> connection_id (from VoiceServerUpdate; required for voice state updates) */
  private readonly connectionIds = new Map<string, string>();
  /** guild_id -> user_id -> channel_id */
  readonly voiceStates: VoiceStateMap = new Map();
  /** channel_id -> pending join */
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
      this.handleVoiceStateUpdate(data),
    );
    this.client.on(Events.VoiceServerUpdate, (data: GatewayVoiceServerUpdateDispatchData) =>
      this.handleVoiceServerUpdate(data),
    );
    this.client.on(
      Events.VoiceStatesSync,
      (data: {
        guildId: string;
        voiceStates: Array<{ user_id: string; channel_id: string | null }>;
      }) => this.handleVoiceStatesSync(data),
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
      `[VoiceManager] VoiceStateUpdate guild=${guildId} user=${data.user_id} channel=${data.channel_id ?? 'null'} (bot=${this.client.user?.id})`,
    );
    let guildMap = this.voiceStates.get(guildId);
    if (!guildMap) {
      guildMap = new Map();
      this.voiceStates.set(guildId, guildMap);
    }
    guildMap.set(data.user_id, data.channel_id);

    const channelKey = data.channel_id ?? guildId;
    const pendingByChannel = this.pending.get(channelKey);
    const pendingByGuild = this.pending.get(guildId);
    const pending = pendingByChannel ?? pendingByGuild;
    const isBot = String(data.user_id) === String(this.client.user?.id);
    if (isBot && data.connection_id) {
      this.storeConnectionId(channelKey, data.connection_id);
    }
    if (pending && isBot) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] VoiceStateUpdate for bot - completing pending channel ${channelKey}`,
      );
      pending.state = data;
      this.tryCompletePending(pendingByChannel ? channelKey : guildId, pending);
    }
  }

  private handleVoiceServerUpdate(data: GatewayVoiceServerUpdateDispatchData): void {
    const guildId = data.guild_id;

    let pending = this.pending.get(guildId);
    if (!pending) {
      for (const [, p] of this.pending) {
        if (p.channel?.guildId === guildId) {
          pending = p;
          break;
        }
      }
    }
    if (pending) {
      const channelKey = pending.channel?.id ?? guildId;
      const hasToken = !!(data.token && data.token.length > 0);
      this.client.emit?.(
        'debug',
        `[VoiceManager] VoiceServerUpdate guild=${guildId} channel=${channelKey} endpoint=${data.endpoint ?? 'null'} token=${hasToken ? 'yes' : 'NO'}`,
      );
      pending.server = data;
      this.tryCompletePending(channelKey, pending);
      return;
    }

    const userId = this.client.user?.id;
    if (!userId) {
      this.client.emit?.(
        'debug',
        '[VoiceManager] Client user not available. Ensure the client is logged in.',
      );
      return;
    }

    let conn: VoiceConnection | LiveKitRtcConnection | undefined;
    for (const [, c] of this.connections) {
      if (c?.channel?.guildId === guildId) {
        conn = c;
        break;
      }
    }
    if (!conn) return;

    if (!data.endpoint || !data.token) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Voice server endpoint null for guild ${guildId}; disconnecting`,
      );
      conn.destroy();
      this.connections.delete(conn.channel.id);
      return;
    }

    if (!isLiveKitEndpoint(data.endpoint, data.token)) return;

    if (conn instanceof LiveKitRtcConnection && conn.isSameServer(data.endpoint, data.token)) {
      return;
    }

    const channel = conn.channel;
    this.client.emit?.(
      'debug',
      `[VoiceManager] Voice server migration for guild ${guildId} channel ${channel.id}; reconnecting`,
    );
    conn.destroy();
    this.connections.delete(channel.id);
    this.connectionIds.delete(channel.id);
    this.storeConnectionId(channel.id, data.connection_id);

    const ConnClass = LiveKitRtcConnection;
    const newConn = new ConnClass(this.client, channel, userId);
    this.registerConnection(channel.id, newConn);

    const state: GatewayVoiceStateUpdateDispatchData = {
      guild_id: guildId,
      channel_id: channel.id,
      user_id: userId,
      session_id: '',
    };

    newConn.connect(data, state).catch((e) => {
      this.connections.delete(channel.id);
      newConn.emit('error', e instanceof Error ? e : new Error(String(e)));
    });
  }

  private storeConnectionId(channelId: string, connectionId: string | null | undefined): void {
    const id = connectionId != null ? String(connectionId) : null;
    if (id) this.connectionIds.set(channelId, id);
    else this.connectionIds.delete(channelId);
  }

  private registerConnection(
    channelId: string,
    conn: VoiceConnection | LiveKitRtcConnection,
  ): void {
    const cid = conn.channel?.id ?? channelId;
    this.connections.set(cid, conn);
    conn.once('disconnect', () => {
      this.connections.delete(cid);
      this.connectionIds.delete(cid);
    });
    conn.on('requestVoiceStateSync', (p: { self_stream?: boolean; self_video?: boolean }) => {
      this.updateVoiceState(cid, p);
      if (p.self_stream) {
        this.uploadStreamPreview(cid, conn).catch((e) =>
          this.client.emit?.('debug', `[VoiceManager] Stream preview upload failed: ${String(e)}`),
        );
      }
    });
  }

  /** Upload a placeholder stream preview so the preview URL returns 200 instead of 404. */
  private async uploadStreamPreview(
    channelId: string,
    conn: VoiceConnection | LiveKitRtcConnection,
  ): Promise<void> {
    const cid = conn.channel?.id ?? channelId;
    const connectionId = this.connectionIds.get(cid);
    if (!connectionId) return;

    const streamKey = `${conn.channel.guildId}:${conn.channel.id}:${connectionId}`;
    const route = Routes.streamPreview(streamKey);
    const body = { channel_id: conn.channel.id, thumbnail, content_type: 'image/png' };

    await this.client.rest.post(route, { body, auth: true });
    this.client.emit?.('debug', `[VoiceManager] Uploaded stream preview for ${streamKey}`);
  }

  private tryCompletePending(
    channelId: string,
    pending: {
      channel: VoiceChannel;
      resolve: (c: VoiceConnection | LiveKitRtcConnection) => void;
      reject: (e: Error) => void;
      server?: GatewayVoiceServerUpdateDispatchData;
      state?: GatewayVoiceStateUpdateDispatchData;
    },
  ): void {
    if (!pending?.server) return;

    const useLiveKit = isLiveKitEndpoint(pending.server.endpoint, pending.server.token);
    const hasState = !!pending.state;

    if (!useLiveKit && !hasState) return;
    if (useLiveKit && !hasState) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Proceeding with VoiceServerUpdate only (LiveKit does not require VoiceStateUpdate)`,
      );
    }

    const userId = this.client.user?.id;
    if (!userId) {
      this.client.emit?.(
        'debug',
        '[VoiceManager] Client user not available. Ensure the client is logged in.',
      );
      return;
    }

    const guildId = pending.channel?.guildId ?? '';
    const state: GatewayVoiceStateUpdateDispatchData = pending.state ?? {
      guild_id: guildId,
      channel_id: pending.channel.id,
      user_id: userId,
      session_id: '',
    };

    this.storeConnectionId(
      channelId,
      pending.server.connection_id ?? (state as { connection_id?: string }).connection_id,
    );
    this.pending.delete(channelId);
    const ConnClass = useLiveKit ? LiveKitRtcConnection : VoiceConnection;
    const conn = new ConnClass(this.client, pending.channel, userId);
    this.registerConnection(channelId, conn);
    conn.connect(pending.server, state).then(
      () => pending.resolve(conn),
      (e) => pending.reject(e),
    );
  }

  /**
   * Join a voice channel. Resolves when the connection is ready.
   * Supports multiple connections per guild (Fluxer multi-channel).
   * @param channel - The voice channel to join
   * @returns The voice connection (LiveKitRtcConnection when Fluxer uses LiveKit)
   */
  async join(channel: VoiceChannel): Promise<VoiceConnection | LiveKitRtcConnection> {
    const channelId = channel.id;
    const existing = this.connections.get(channelId);
    if (existing) {
      const isReusable = existing instanceof LiveKitRtcConnection ? existing.isConnected() : true;
      if (isReusable) return existing;
      existing.destroy();
      this.connections.delete(channelId);
    }
    return new Promise((resolve, reject) => {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Requesting voice join guild=${channel.guildId} channel=${channelId}`,
      );
      const timeout = setTimeout(() => {
        if (this.pending.has(channelId)) {
          this.pending.delete(channelId);
          reject(
            new Error(
              'Voice connection timeout. Ensure the server has voice enabled and the bot has Connect permissions. ' +
                'The gateway must send VoiceServerUpdate and VoiceStateUpdate in response.',
            ),
          );
        }
      }, 20_000);
      this.pending.set(channelId, {
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
   * Leave all voice channels in a guild.
   * With multi-channel support, disconnects from every channel in the guild.
   * @param guildId - Guild ID to leave
   */
  leave(guildId: string): void {
    const toLeave: { channelId: string; conn: VoiceConnection | LiveKitRtcConnection }[] = [];
    for (const [cid, c] of this.connections) {
      if (c?.channel?.guildId === guildId) toLeave.push({ channelId: cid, conn: c });
    }
    for (const { channelId, conn } of toLeave) {
      conn.destroy();
      this.connections.delete(channelId);
      this.connectionIds.delete(channelId);
    }
    if (toLeave.length > 0) {
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
  }

  /**
   * Leave a specific voice channel by channel ID.
   * @param channelId - Channel ID to leave
   */
  leaveChannel(channelId: string): void {
    const conn = this.connections.get(channelId);
    if (conn) {
      const guildId = conn.channel?.guildId;
      conn.destroy();
      this.connections.delete(channelId);
      this.connectionIds.delete(channelId);
      if (guildId) {
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
    }
  }

  /**
   * Get the active voice connection for a channel or guild.
   * @param channelOrGuildId - Channel ID (primary) or guild ID (returns first connection in that guild)
   */
  getConnection(channelOrGuildId: string): VoiceConnection | LiveKitRtcConnection | undefined {
    const byChannel = this.connections.get(channelOrGuildId);
    if (byChannel) return byChannel;
    for (const [, c] of this.connections) {
      if (c?.channel?.guildId === channelOrGuildId) return c;
    }
    return undefined;
  }

  /**
   * Update voice state (e.g. self_stream, self_video) while in a channel.
   * Sends a VoiceStateUpdate to the gateway so the server and clients see the change.
   * Requires connection_id (from VoiceServerUpdate); without it, the gateway would treat
   * the update as a new join and trigger a new VoiceServerUpdate, causing connection loops.
   * @param channelId - Channel ID (connection key)
   * @param partial - Partial voice state to update (self_stream, self_video, self_mute, self_deaf)
   */
  updateVoiceState(
    channelId: string,
    partial: {
      self_stream?: boolean;
      self_video?: boolean;
      self_mute?: boolean;
      self_deaf?: boolean;
    },
  ): void {
    const conn = this.connections.get(channelId);
    if (!conn) return;

    const connectionId = this.connectionIds.get(channelId);
    const guildId = conn.channel?.guildId;
    if (!connectionId) {
      this.client.emit?.(
        'debug',
        `[VoiceManager] Skipping voice state sync: no connection_id for channel ${channelId}`,
      );
      return;
    }

    this.client.sendToGateway(this.shardId, {
      op: GatewayOpcodes.VoiceStateUpdate,
      d: {
        guild_id: guildId ?? '',
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
