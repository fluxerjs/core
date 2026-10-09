import { channelHandlers } from './Channels.js';
import { guildResourceHandlers } from './GuildResources.js';
import { guildHandlers } from './Guilds.js';
import { inviteHandlers } from './Invites.js';
import { memberHandlers } from './Members.js';
import { messageHandlers } from './Messages.js';
import { passthroughHandlers } from './Passthrough.js';
import { threadHandlers } from './Threads.js';
import { buildRegistry, type DispatchHandler } from './Types.js';

export type { DispatchHandler };

/** Registry of gateway dispatch event handlers. */
export const eventHandlers = buildRegistry(
  messageHandlers,
  guildHandlers,
  channelHandlers,
  memberHandlers,
  inviteHandlers,
  guildResourceHandlers,
  passthroughHandlers,
  threadHandlers,
);
