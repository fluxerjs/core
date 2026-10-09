import type {
  APIChannel,
  APIGuildMember,
  GatewayForumUnreadsDispatchData,
  GatewayThreadDeleteDispatchData,
  GatewayThreadListSyncDispatchData,
  GatewayThreadMemberListUpdateDispatchData,
  GatewayThreadMembersUpdateDispatchData,
  GatewayThreadMemberUpdateDispatchData,
} from '@fluxerjs/types';
import { Channel } from '../../Domain/Channel/index.js';
import { isThreadType, ThreadMember } from '../../Domain/Channel/ThreadChannel.js';
import { fetchedThreadsFrom } from '../../Domain/Channel/ThreadManager.js';
import { cacheMember } from '../../Domain/Guild/Cache.js';
import { Events } from '../../Helpers/Events.js';
import type { Client } from '../Client.js';
import type {
  ForumUnreadsPayload,
  ThreadListSyncPayload,
  ThreadMemberListUpdatePayload,
  ThreadMembersUpdatePayload,
} from '../EventPayloads.js';
import { channelHandlers } from './Channels.js';
import type { HandlerMap } from './Types.js';

function cachedChannel(client: Client, id: string) {
  const direct = client.channels.get(id);
  if (direct) return direct;
  for (const guild of client.guilds.values()) {
    const nested = guild.channels.get(id);
    if (nested) return nested;
  }
  return null;
}

/** Thread dispatches are channel objects plus membership sync. */
export const threadHandlers: HandlerMap = {
  THREAD_CREATE(client, d) {
    channelHandlers.CHANNEL_CREATE!(client, d as APIChannel);
  },

  THREAD_UPDATE(client, d) {
    channelHandlers.CHANNEL_UPDATE!(client, d as APIChannel);
  },

  THREAD_DELETE(client, d) {
    const data = d as GatewayThreadDeleteDispatchData;
    const existing = data.id ? cachedChannel(client, data.id) : null;
    if (existing?.isThread()) {
      channelHandlers.CHANNEL_DELETE!(client, data);
      return;
    }
    if (!data.id || !isThreadType(data.type)) return;
    const thread = Channel.from(client, {
      id: data.id,
      type: data.type,
      guild_id: data.guild_id,
      parent_id: data.parent_id,
    } as APIChannel);
    if (!thread.isThread()) return;
    client.emit(Events.ChannelDelete, thread);
    client.emit(Events.ThreadDelete, thread);
  },

  THREAD_LIST_SYNC(client, d) {
    const data = d as GatewayThreadListSyncDispatchData;
    const { threads } = fetchedThreadsFrom(client, {
      threads: data.threads ?? [],
      members: data.members ?? [],
    });
    const payload: ThreadListSyncPayload = {
      guildId: data.guild_id,
      channelIds: data.channel_ids ?? [],
      threads,
    };
    client.emit(Events.ThreadListSync, payload);
  },

  THREAD_MEMBER_UPDATE(client, d) {
    const data = d as GatewayThreadMemberUpdateDispatchData;
    const member = new ThreadMember(data);
    const thread = member.id ? client.channels.get(member.id) : undefined;
    if (thread?.isThread() && member.userId && member.userId === client.user?.id) {
      thread.member = member;
    }
    client.emit(Events.ThreadMemberUpdate, member);
  },

  THREAD_MEMBERS_UPDATE(client, d) {
    const data = d as GatewayThreadMembersUpdateDispatchData;
    const thread = client.channels.get(data.id);
    if (thread?.isThread()) thread.memberCount = data.member_count;
    const payload: ThreadMembersUpdatePayload = {
      id: data.id,
      guildId: data.guild_id,
      memberCount: data.member_count,
      addedMembers: (data.added_members ?? []).map((member) => new ThreadMember(member)),
      removedMemberIds: data.removed_member_ids ?? [],
    };
    client.emit(Events.ThreadMembersUpdate, payload);
  },

  THREAD_MEMBER_LIST_UPDATE(client, d) {
    const data = d as GatewayThreadMemberListUpdateDispatchData;
    const guild = data.guild_id ? client.guilds.get(data.guild_id) : undefined;
    const payload: ThreadMemberListUpdatePayload = {
      guildId: data.guild_id,
      threadId: data.thread_id,
      members: (data.members ?? []).map((entry) => ({
        userId: entry.user_id,
        joinTimestamp: entry.join_timestamp,
        flags: entry.flags,
        member:
          guild && entry.member?.user?.id
            ? cacheMember(guild, entry.member as APIGuildMember & { user: { id: string } })
            : null,
        presence: entry.presence ? { status: entry.presence.status ?? null } : null,
      })),
    };
    client.emit(Events.ThreadMemberListUpdate, payload);
  },

  FORUM_UNREADS(client, d) {
    const data = d as GatewayForumUnreadsDispatchData;
    const payload: ForumUnreadsPayload = {
      guildId: data.guild_id,
      channelId: data.channel_id,
      threads: (data.threads ?? []).map((entry) => ({
        threadId: entry.thread_id,
        count: entry.count ?? null,
        missing: entry.missing === true,
      })),
    };
    client.emit(Events.ForumUnreads, payload);
  },
};
