export { VoiceManager, type VoiceManagerOptions, type VoiceStateMap } from './VoiceManager.js';
export { VoiceConnection, type VoiceConnectionEvents } from './VoiceConnection.js';
export { LiveKitRtcConnection, type LiveKitRtcConnectionEvents } from './LiveKitRtcConnection.js';

import type { Client } from '@fluxerjs/core';
import type { VoiceChannel } from '@fluxerjs/core';
import { VoiceManager } from './VoiceManager.js';

/** Union of connection types (Discord-style or LiveKit). */
export type VoiceConnectionLike = import('./VoiceConnection.js').VoiceConnection | import('./LiveKitRtcConnection.js').LiveKitRtcConnection;

/**
 * Create a voice manager and join a channel in one call.
 * Uses the default shard (0).
 */
export async function joinVoiceChannel(
  client: Client,
  channel: VoiceChannel,
  options?: { shardId?: number }
): Promise<VoiceConnectionLike> {
  const manager = getVoiceManager(client, options);
  return manager.join(channel);
}

const voiceManagers = new WeakMap<Client, VoiceManager>();

/**
 * Get or create the VoiceManager for this client.
 */
export function getVoiceManager(client: Client, options?: { shardId?: number }): VoiceManager {
  let manager = voiceManagers.get(client);
  if (!manager) {
    manager = new VoiceManager(client, options);
    voiceManagers.set(client, manager);
  }
  return manager;
}
