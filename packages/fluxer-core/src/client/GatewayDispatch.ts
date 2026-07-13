import type { GatewayReceivePayload } from '@fluxerjs/types';
import { Events } from '../util/Events.js';
import type { Client } from './Client.js';
import { eventHandlers } from './eventHandlers/index.js';

export function emitClientError(client: Client, err: unknown): void {
  client.emit(Events.Error, err instanceof Error ? err : new Error(String(err)));
}

/**
 * While {@link ClientOptions.waitForGuilds} delays Ready, defer user-facing dispatch handling until Ready fires.
 * GUILD_CREATE and a GUILD_DELETE for a pending guild must still run immediately so guild cache and
 * {@link Client._onGuildReceived} can finish the handshake.
 */
export function shouldDeferGatewayDispatchUntilReady(
  client: Client,
  payload: GatewayReceivePayload,
): boolean {
  if (client.options.waitForGuilds !== true || client.readyAt !== null) return false;
  if (payload.op !== 0 || !payload.t) return false;
  if (payload.t === 'GUILD_CREATE') return false;
  if (payload.t === 'GUILD_DELETE') {
    const data = payload.d as { id?: unknown } | null;
    if (typeof data?.id === 'string' && client._pendingGuildIds?.has(data.id)) return false;
  }
  return true;
}

/**
 * Run gateway event handlers. By default (see {@link ClientOptions.gatewayDeferHandlers}) work is deferred to the next
 * macrotask so user code does not block the WebSocket `message` callback.
 */
export function handleGatewayDispatch(
  client: Client,
  payload: GatewayReceivePayload,
  deferred: GatewayReceivePayload[],
): Promise<void> {
  if (payload.op !== 0 || !payload.t) return Promise.resolve();
  if (shouldDeferGatewayDispatchUntilReady(client, payload)) {
    deferred.push(payload);
    return Promise.resolve();
  }
  return dispatchGatewayPayload(client, payload);
}

export function dispatchGatewayPayload(
  client: Client,
  payload: GatewayReceivePayload,
): Promise<void> {
  const event = payload.t;
  if (!event) return Promise.resolve();
  const handler = eventHandlers.get(event);
  if (!handler) return Promise.resolve();

  const run = async (): Promise<void> => {
    try {
      await handler(client, payload.d);
    } catch (err) {
      emitClientError(client, err);
    }
  };

  if (client.options.gatewayDeferHandlers === false) return run();

  return new Promise<void>((resolve, reject) => {
    const start = (): void => {
      void run().then(resolve).catch(reject);
    };
    if (typeof setImmediate === 'function') setImmediate(start);
    else setTimeout(start, 0);
  });
}

export async function flushDeferredGatewayDispatches(
  client: Client,
  deferred: GatewayReceivePayload[],
): Promise<void> {
  while (deferred.length > 0) {
    const batch = deferred.splice(0, deferred.length);
    for (const p of batch) {
      await dispatchGatewayPayload(client, p);
    }
  }
}
