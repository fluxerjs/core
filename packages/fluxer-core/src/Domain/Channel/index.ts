export type { UploadFileForSend } from './Attachments.js';
export { Channel } from './Base.js';
export { DMChannel } from './Dm.js';
export { ForumChannel, MediaChannel } from './Forum.js';
export {
  AnnouncementChannel,
  CategoryChannel,
  GuildChannel,
  LinkChannel,
  TextChannel,
  VoiceChannel,
} from './Guild.js';
export { PermissionOverwrite } from './PermissionOverwrite.js';
export {
  type PermissionOverwriteEditOptions,
  PermissionOverwriteManager,
} from './PermissionOverwriteManager.js';
export type { FetchPinnedMessagesOptions, PinnedMessagesPage } from './TextCapable.js';
export { cacheThread, ThreadChannel, ThreadMember, ThreadMemberManager } from './ThreadChannel.js';
export {
  type FetchedThreads,
  fetchActiveThreads,
  ThreadManager,
  type ThreadSearchPage,
} from './ThreadManager.js';

import { Channel } from './Base.js';
import type { DMChannel } from './Dm.js';
import { channelFrom, channelFromOrCreate, createDM } from './Factory.js';
import type { TextChannel, VoiceChannel } from './Guild.js';
import { bindThreadManager } from './ThreadBind.js';
import type { ThreadChannel } from './ThreadChannel.js';
import { ThreadManager } from './ThreadManager.js';

/** Channel types that can carry messages (guild text, announcement, threads, guild voice, DMs). */
export type TextBasedChannel = TextChannel | VoiceChannel | DMChannel | ThreadChannel;

// Wire the Channel factory statics here (the channel domain's composition root)
// to avoid a circular import between Base.ts and Factory.ts.
Channel.from = channelFrom;
Channel.fromOrCreate = channelFromOrCreate;
Channel.createDM = createDM;
bindThreadManager((channel) => new ThreadManager(channel));
