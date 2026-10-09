import type { APIChannel } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import { ErrorCodes } from '../../LibErrors/ErrorCodes.js';
import { FluxerError } from '../../LibErrors/FluxerError.js';
import { Channel } from './Base.js';
import type { ThreadChannel } from './ThreadChannel.js';

/** Put a thread into the client and guild channel caches. */
export function cacheThread(client: Client, data: APIChannel): ThreadChannel {
  const existing = client.channels.get(data.id);
  if (existing?.isThread() && existing.type === data.type) {
    existing._patch(data);
    placeThread(client, existing);
    return existing;
  }
  const created = Channel.from(client, data);
  if (!created.isThread()) {
    throw new FluxerError(`Channel ${data.id} is not a thread`, {
      code: ErrorCodes.InvalidChannelType,
    });
  }
  placeThread(client, created);
  return created;
}

function placeThread(client: Client, thread: ThreadChannel): void {
  client.channels.set(thread.id, thread);
  if (!thread.guildId) return;
  const guild = client.guilds.get(thread.guildId);
  if (guild) guild.channels.set(thread.id, thread);
}
