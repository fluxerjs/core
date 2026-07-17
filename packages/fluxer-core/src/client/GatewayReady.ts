import type {
  APIChannel,
  APIEmoji,
  APIGuildMember,
  APISticker,
  APIUser,
  GatewayReceivePayload,
  GatewayVoiceStateUpdateDispatchData,
} from '@fluxerjs/types';
import { WebSocketManager } from '@fluxerjs/ws';
import { ErrorCodes } from '../errors/ErrorCodes.js';
import { FluxerError } from '../errors/FluxerError.js';
import { Channel, type GuildChannel } from '../structures/Channel.js';
import { Guild } from '../structures/Guild.js';
import { Events } from '../util/Events.js';
import { type GatewayGuildPayload, normalizeGuildSnapshotPayload } from '../util/guildUtils';
import type { Client } from './Client.js';
import { ClientUser } from './ClientUser.js';
import {
  emitClientError,
  flushDeferredGatewayDispatches,
  handleGatewayDispatch,
} from './GatewayDispatch.js';

export type ReadyPayload = {
  user: APIUser;
  guilds: ReadyGuildPayload[];
};

type ReadyGuildPayload = GatewayGuildPayload & {
  unavailable?: boolean;
  channels?: APIChannel[];
  emojis?: APIEmoji[];
  members?: APIGuildMember[];
  stickers?: APISticker[];
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
      if (pending !== null && g.id) pending.add(g.id);
      continue;
    }
    const guildData = normalizeGuildSnapshotPayload(g as unknown);
    if (!guildData) continue;
    const guild = new Guild(client, guildData);
    client.guilds.set(guild.id, guild);
    for (const ch of g.channels ?? []) {
      const channel = Channel.from(client, ch);
      if (channel) {
        client.channels.set(channel.id, channel);
        guild.channels.set(channel.id, channel as GuildChannel);
      }
    }
    if (g.voice_states?.length) {
      client.emit(Events.VoiceStatesSync, {
        guildId: guild.id,
        voiceStates: g.voice_states,
      });
    }
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
  if (pending !== null && pending.size > 0) {
    client._pendingGuildIds = pending;
    return;
  }
  if (waitForGuilds && guilds.length === 0) {
    client._guildStreamSettleTimeout = setTimeout(() => {
      client._guildStreamSettleTimeout = null;
      finalizeClientReady(client);
    }, GUILD_STREAM_SETTLE_MS);
    return;
  }
  finalizeClientReady(client);
}

function normalizeIntents(client: Client, intents: number): number {
  if (intents === 0) return 0;
  if (!client.options.suppressIntentWarning) {
    if (typeof process !== 'undefined' && process.emitWarning) {
      process.emitWarning('Fluxer does not support intents yet. Value has been set to 0.', {
        type: 'FluxerIntents',
      });
    } else {
      console.warn('Fluxer does not support intents yet. Value has been set to 0.');
    }
  }
  return 0;
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

  const intents = normalizeIntents(client, client.options.intents ?? 0);
  const ws = new WebSocketManager({
    token,
    intents,
    presence: client.options.presence,
    rest: {
      get: (route: string) => client.rest.get(route, signal ? { signal } : undefined),
    },
    version: client.options.rest?.version ?? '1',
    debug: client.options.gatewayDebug !== false,
    WebSocket: client.options.WebSocket,
  });

  ws.on('dispatch', ({ payload }: { payload: GatewayReceivePayload }) => {
    handleGatewayDispatch(client, payload, client._deferredGatewayDispatches).catch(
      (err: unknown) => emitClientError(client, err),
    );
  });
  ws.on('ready', ({ data }: { data: ReadyPayload }) => {
    handleReadyPayload(client, data);
  });
  ws.on('error', ({ error }: { error: Error }) => client.emit(Events.Error, error));
  ws.on('debug', (msg: string) => client.emit(Events.Debug, msg));

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
