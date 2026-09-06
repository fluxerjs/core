import type {
  APIChannel,
  APIEmoji,
  APIGuildMember,
  APISticker,
  GatewayReadyDispatchData,
  GatewayReceivePayload,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import { GatewayCloseCodes, WebSocketManager } from '@fluxerjs/ws';
import type { GatewayGuildPayload } from '../Domain/Guild/Payload.js';
import { applyGuildSnapshotFromGateway } from '../Domain/Guild/Snapshot.js';
import { Events } from '../Helpers/Events.js';
import { ErrorCodes } from '../LibErrors/ErrorCodes.js';
import { FluxerError } from '../LibErrors/FluxerError.js';
import type { Client } from './Client.js';
import { ClientUser } from './ClientUser.js';
import {
  emitClientError,
  flushDeferredGatewayDispatches,
  handleGatewayDispatch,
} from './GatewayDispatch.js';
import { toPresenceWire } from './SdkOptions/Presence.js';

export type ReadyPayload = GatewayReadyDispatchData;

type ReadyGuildPayload = GatewayGuildPayload & {
  unavailable?: boolean;
  channels?: APIChannel[];
  emojis?: APIEmoji[];
  members?: APIGuildMember[];
  stickers?: APISticker[];
  roles?: import('@fluxerjs/types').APIRole[];
  voice_states?: GatewayVoiceStateUpdateDispatchData[];
};

/** Milliseconds to wait for GUILD_CREATE stream when READY has no guilds. */
export const GUILD_STREAM_SETTLE_MS = 500;

/** Hydrate guild and channel caches from the READY payload. Returns pending unavailable guild IDs when waitForGuilds. */
export function hydrateReadyGuilds(
  client: Client,
  guilds: ReadyGuildPayload[],
  waitForGuilds: boolean,
): Set<string> | null {
  const pending = waitForGuilds ? new Set<string>() : null;
  for (const g of guilds ?? []) {
    if (g.unavailable === true) {
      if (typeof g.id === 'string') {
        const existing = client.guilds.get(g.id);
        if (existing && existing.available !== false) {
          existing.available = false;
        }
        if (pending !== null) pending.add(g.id);
      }
      continue;
    }
    applyGuildSnapshotFromGateway(client, g);
  }
  return pending;
}

export function finalizeClientReady(client: Client): void {
  client._pendingGuildIds = null;
  client.readyAt = new Date();
  client.emit(Events.Ready);
  void flushDeferredGatewayDispatches(client, client._deferredGatewayDispatches).catch(
    (err: unknown) => emitClientError(client, err),
  );
}

export function onClientGuildReceived(client: Client, guildId: string): void {
  const pending = client._pendingGuildIds;
  if (pending === null) return;
  pending.delete(guildId);
  if (pending.size === 0) finalizeClientReady(client);
}

export function clearGuildStreamSettle(client: Client): void {
  if (client._guildStreamSettleTimeout === null) return;
  clearTimeout(client._guildStreamSettleTimeout);
  client._guildStreamSettleTimeout = null;
}

function handleReadyPayload(client: Client, data: ReadyPayload): void {
  client.user = new ClientUser(client, data.user);
  const waitForGuilds = client.options.waitForGuilds === true;
  const guilds = data.guilds ?? [];
  const pending = hydrateReadyGuilds(client, guilds, waitForGuilds);

  // Already ready from an earlier shard — only hydrate additional guilds.
  if (client.readyAt !== null) {
    if (pending !== null && pending.size > 0) {
      const existing = client._pendingGuildIds ?? new Set<string>();
      for (const id of pending) existing.add(id);
      client._pendingGuildIds = existing;
    }
    return;
  }

  if (pending !== null && pending.size > 0) {
    const existing = client._pendingGuildIds ?? new Set<string>();
    for (const id of pending) existing.add(id);
    client._pendingGuildIds = existing;
    return;
  }
  if (waitForGuilds && guilds.length === 0) {
    if (client._guildStreamSettleTimeout === null) {
      client._guildStreamSettleTimeout = setTimeout(() => {
        client._guildStreamSettleTimeout = null;
        if (client.readyAt === null) finalizeClientReady(client);
      }, GUILD_STREAM_SETTLE_MS);
    }
    return;
  }
  finalizeClientReady(client);
}

/** Create WebSocketManager, wire dispatch/ready/error/debug, and connect. */
export async function connectClientGateway(
  client: Client,
  token: string,
  signal?: AbortSignal,
): Promise<WebSocketManager> {
  if (signal?.aborted) {
    throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
  }

  const ws = new WebSocketManager({
    token,
    intents: client.options.intents ?? 0,
    presence: client.options.presence
      ? (toPresenceWire(client.options.presence) as never)
      : undefined,
    flags: client.options.identifyFlags,
    ignoredEvents: client.options.ignoredEvents,
    initialGuildId: client.options.initialGuildId,
    rest: {
      get: (route: string) => client.rest.get(route, signal ? { signal } : undefined),
    },
    version: client.options.rest?.version ?? '1',
    debug: client.options.gatewayDebug !== false,
    WebSocket: client.options.WebSocket,
    shardCount: client.options.shardCount ?? client.options.totalShards,
    shardIds: client.options.shardIds ?? client.options.shardList,
    guildsPerShard: client.options.guildsPerShard,
    buildStrategy: client.options.buildStrategy,
    sessionStore: client.options.sessionStore,
    identifyThrottler: client.options.identifyThrottler,
  });

  ws.on('dispatch', ({ payload }: { payload: GatewayReceivePayload }) => {
    handleGatewayDispatch(client, payload, client._deferredGatewayDispatches).catch(
      (err: unknown) => emitClientError(client, err),
    );
  });
  ws.on('ready', ({ shardId, data }: { shardId: number; data: ReadyPayload }) => {
    client.emit(Events.ShardReady, shardId);
    try {
      handleReadyPayload(client, data);
    } catch (err: unknown) {
      emitClientError(client, err);
    }
  });
  ws.on('resumed', (shardId: number) => {
    // Per-shard signal only. Client-level {@link Events.Resumed} comes from the RESUMED dispatch.
    client.emit(Events.ShardResumed, shardId);
  });
  ws.on('close', ({ shardId, code }: { shardId: number; code: number }) => {
    client.emit(Events.ShardDisconnect, shardId, code);
    if (code === GatewayCloseCodes.AuthenticationFailed) {
      emitClientError(
        client,
        new FluxerError('Gateway authentication failed (4004). Check the bot token.', {
          code: ErrorCodes.InvalidToken,
        }),
      );
    }
  });
  ws.on('error', ({ shardId, error }: { shardId: number; error: Error }) => {
    if (shardId >= 0) client.emit(Events.ShardError, shardId, error);
    client.logger.error('gateway error', {
      error: error.message,
      name: error.name,
      shardId,
    });
    client.emit(Events.Error, error);
  });
  ws.on('debug', (msg: string) => {
    client.logger.debug(msg);
    client.emit(Events.Debug, msg);
  });
  ws.on('shardingRequired', (payload: { shardId: number; numShards: number }) => {
    client.emit(Events.ShardingRequired, payload);
  });

  // Expose early so Client.destroy() / abort can tear down an in-flight connect.
  client._ws = ws;

  const onAbort = (): void => {
    ws.destroy();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    if (signal?.aborted) {
      throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
    }
    await ws.connect();
    if (signal?.aborted) {
      ws.destroy();
      throw new FluxerError('Connection aborted', { code: ErrorCodes.GatewayConnectionAborted });
    }
    return ws;
  } catch (err) {
    ws.destroy();
    if (client._ws === ws) client._ws = null;
    throw err;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}
