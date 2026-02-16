export { VoiceManager, type VoiceManagerOptions, type VoiceStateMap } from './VoiceManager.js';
export { VoiceConnection, type VoiceConnectionEvents } from './VoiceConnection.js';
export {
  LiveKitRtcConnection,
  type LiveKitRtcConnectionEvents,
  type VideoPlayOptions,
} from './LiveKitRtcConnection.js';

import type { Client } from '@fluxerjs/core';
import type { VoiceChannel } from '@fluxerjs/core';
import { VoiceManager } from './VoiceManager.js';

/** Union of connection types (Discord-style or LiveKit). */
export type VoiceConnectionLike =
  | import('./VoiceConnection.js').VoiceConnection
  | import('./LiveKitRtcConnection.js').LiveKitRtcConnection;

/**
 * Create a voice manager and join a voice channel in one call.
 *
 * @param client - The Fluxer client instance
 * @param channel - The voice channel to join
 * @param options - Optional options; `shardId` for the gateway shard to use (default 0)
 * @returns The voice connection (LiveKitRtcConnection when using LiveKit)
 */
export async function joinVoiceChannel(
  client: Client,
  channel: VoiceChannel,
  options?: { shardId?: number },
): Promise<VoiceConnectionLike> {
  const manager = getVoiceManager(client, options);
  return manager.join(channel);
}

const voiceManagers = new WeakMap<Client, VoiceManager>();

/**
 * Get or create the VoiceManager for this client.
 *
 * @param client - The Fluxer client instance
 * @param options - Optional options; `shardId` for the gateway shard to use (default 0)
 */
export function getVoiceManager(client: Client, options?: { shardId?: number }): VoiceManager {
  let manager = voiceManagers.get(client);
  if (!manager) {
    manager = new VoiceManager(client, options);
    voiceManagers.set(client, manager);
  }
  return manager;
}
