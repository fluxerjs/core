import type { ChannelType } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import type { ThreadManager } from './ThreadManager.js';

/** Structural parent a {@link ThreadManager} is bound to. */
export interface ThreadParentChannel {
  id: string;
  client: Client;
  type: ChannelType;
}

type ThreadManagerFactory = (channel: ThreadParentChannel) => ThreadManager;

let factory: ThreadManagerFactory | undefined;
const managers = new WeakMap<ThreadParentChannel, ThreadManager>();

/** Called once from the channel composition root after classes are defined. */
export function bindThreadManager(next: ThreadManagerFactory): void {
  factory = next;
}

/** Thread manager for a text or announcement channel. */
export function threadManagerFor(channel: ThreadParentChannel): ThreadManager {
  const existing = managers.get(channel);
  if (existing) return existing;
  if (!factory) {
    throw new Error('ThreadManager is not initialized');
  }
  const created = factory(channel);
  managers.set(channel, created);
  return created;
}
