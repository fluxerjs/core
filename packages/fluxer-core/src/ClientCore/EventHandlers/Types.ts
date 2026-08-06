import type { GatewayDispatchDataMap, GatewayDispatchEventName } from '@fluxerjs/types';
import type { Client } from '../Client.js';

export type DispatchHandler<Event extends GatewayDispatchEventName = GatewayDispatchEventName> = (
  client: Client,
  data: GatewayDispatchDataMap[Event],
) => void | Promise<void>;

export type HandlerMap = Partial<{
  [Event in GatewayDispatchEventName]: DispatchHandler<Event>;
}>;

export type ErasedDispatchHandler = (client: Client, data: unknown) => void | Promise<void>;

/** Emit gateway payload as-is under a client event name. */
export function pass(event: string): ErasedDispatchHandler {
  return (client, data) => {
    client.emit(event, data);
  };
}

/** Merge handler maps into a dispatch registry. */
export function buildRegistry(...maps: HandlerMap[]): Map<string, ErasedDispatchHandler> {
  const registry = new Map<string, ErasedDispatchHandler>();
  for (const map of maps) {
    for (const [event, handler] of Object.entries(map)) {
      registry.set(event, handler as ErasedDispatchHandler);
    }
  }
  return registry;
}
