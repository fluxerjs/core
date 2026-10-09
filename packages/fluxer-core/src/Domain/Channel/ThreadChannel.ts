import type { APIChannel, APIThreadMember, APIThreadMetadata } from '@fluxerjs/types';
import { ChannelType, Routes } from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import {
  type ChannelEditOptions,
  type FetchThreadMembersOptions,
  type ThreadEditOptions,
  type ThreadMemberSettingsOptions,
  toThreadEditBody,
  toThreadMemberSettingsBody,
  withQuery,
} from '../../ClientCore/SdkOptions/index.js';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import { GuildChannel } from './Guild.js';
import { TextCapable } from './TextCapable.js';

export { cacheThread } from './ThreadCache.js';

/** A user who has joined a thread. */
export class ThreadMember {
  /** Thread ID. */
  readonly id: string | null;
  /** User ID. */
  readonly userId: string | null;
  /** When the user last joined the thread. */
  readonly joinedAt: Date;
  /** Thread member flags bitfield. */
  flags: number;
  /** Whether the current user has muted the thread. */
  muted: boolean | null;
  /** ISO-8601 timestamp when the mute expires, if set. */
  muteEndTime: string | null;
  /** Selected mute duration in seconds, if set. */
  muteWindow: number | null;

  constructor(data: APIThreadMember) {
    this.id = data.id ?? null;
    this.userId = data.user_id ?? data.member?.user?.id ?? null;
    this.joinedAt = new Date(data.join_timestamp);
    this.flags = data.flags;
    this.muted = data.muted ?? null;
    this.muteEndTime = data.mute_config?.end_time ?? null;
    this.muteWindow = data.mute_config?.selected_time_window ?? null;
  }
}

/** Thread fields from either a thread edit or a generic channel edit. */
function threadEditFields(options: ThreadEditOptions | ChannelEditOptions): ThreadEditOptions {
  const source = options as ThreadEditOptions & ChannelEditOptions;
  return {
    name: typeof source.name === 'string' ? source.name : undefined,
    archived: source.archived,
    autoArchiveDuration: source.autoArchiveDuration,
    locked: source.locked,
    rateLimitPerUser: source.rateLimitPerUser,
    flags: source.flags,
    appliedTags: source.appliedTags,
    invitable: source.invitable,
    reason: source.reason,
  };
}

function readMetadata(data: APIThreadMetadata | undefined): {
  archived: boolean;
  autoArchiveDuration: number;
  archiveTimestamp: string | null;
  locked: boolean;
  invitable: boolean | null;
} {
  return {
    archived: data?.archived ?? false,
    autoArchiveDuration: data?.auto_archive_duration ?? 0,
    archiveTimestamp: data?.archive_timestamp ?? null,
    locked: data?.locked ?? false,
    invitable: data?.invitable ?? null,
  };
}

/**
 * A thread inside a text, announcement, forum, or media channel.
 * Threads are text-capable channels: use {@link send} the same way as a text channel.
 */
export class ThreadChannel extends TextCapable(GuildChannel) {
  /** Parent channel ID. */
  declare parentId: string | null;
  /** User who created the thread. */
  ownerId: string | null;
  /** Whether the thread is archived. */
  archived: boolean;
  /** Minutes of inactivity before the thread archives. */
  autoArchiveDuration: number;
  /** ISO-8601 timestamp when the archive status last changed. */
  archiveTimestamp: string | null;
  /** Whether only moderators can unarchive the thread. */
  locked: boolean;
  /** Whether non-moderators can add other non-moderators. Private threads only. */
  invitable: boolean | null;
  /** Slowmode in seconds. */
  rateLimitPerUser: number;
  /** ID of the last message sent in this thread. */
  lastMessageId: string | null;
  /** Messages in the thread, excluding the starter and deleted messages. */
  messageCount: number;
  /** Messages ever sent in the thread. This count is never decremented. */
  totalMessageSent: number;
  /** Approximate member count, capped at 50. */
  memberCount: number;
  /** Tag IDs applied to a forum or media post. */
  appliedTags: string[];
  /** Channel flags bitfield. */
  flags: number;
  /** The current user's membership, when the payload included it. */
  member: ThreadMember | null;
  /** Add, remove, and list members of this thread. */
  readonly members: ThreadMemberManager;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    const metadata = readMetadata(data.thread_metadata);
    this.ownerId = data.owner_id ?? null;
    this.archived = metadata.archived;
    this.autoArchiveDuration = metadata.autoArchiveDuration;
    this.archiveTimestamp = metadata.archiveTimestamp;
    this.locked = metadata.locked;
    this.invitable = metadata.invitable;
    this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    this.lastMessageId = data.last_message_id ?? null;
    this.messageCount = data.message_count ?? 0;
    this.totalMessageSent = data.total_message_sent ?? 0;
    this.memberCount = data.member_count ?? 0;
    this.appliedTags = data.applied_tags ?? [];
    this.flags = data.flags ?? 0;
    this.member = data.member ? new ThreadMember(data.member) : null;
    this.members = new ThreadMemberManager(this);
  }

  /** @internal */
  override _patch(data: APIChannel): void {
    super._patch(data);
    if (data.owner_id !== undefined) this.ownerId = data.owner_id ?? null;
    if (data.thread_metadata) {
      const metadata = readMetadata(data.thread_metadata);
      this.archived = metadata.archived;
      this.autoArchiveDuration = metadata.autoArchiveDuration;
      this.archiveTimestamp = metadata.archiveTimestamp;
      this.locked = metadata.locked;
      this.invitable = metadata.invitable;
    }
    if ('rate_limit_per_user' in data && data.rate_limit_per_user !== undefined) {
      this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    }
    if ('last_message_id' in data) this.lastMessageId = data.last_message_id ?? null;
    if (data.message_count !== undefined) this.messageCount = data.message_count;
    if (data.total_message_sent !== undefined) this.totalMessageSent = data.total_message_sent;
    if (data.member_count !== undefined) this.memberCount = data.member_count;
    if (data.applied_tags !== undefined) this.appliedTags = data.applied_tags ?? [];
    if (data.flags !== undefined) this.flags = data.flags;
    if (data.member !== undefined) this.member = data.member ? new ThreadMember(data.member) : null;
  }

  /**
   * Edit this thread. Requires Manage Threads on public threads, or ownership on private ones.
   * `appliedTags` is sent for public and announcement threads. `invitable` is sent for private threads.
   */
  override async edit(options: ThreadEditOptions | ChannelEditOptions): Promise<this> {
    const data = await this.client.rest.patch<APIChannel>(Routes.channel(this.id), {
      body: toThreadEditBody(this.type, threadEditFields(options)),
      auth: true,
      ...auditReasonHeaders(options.reason),
    });
    this._patch(data);
    return this;
  }

  /** Archive or unarchive this thread. */
  async setArchived(archived: boolean, reason?: string): Promise<this> {
    return this.edit({ archived, reason });
  }

  /** Lock or unlock this thread. Locked threads can only be unarchived by moderators. */
  async setLocked(locked: boolean, reason?: string): Promise<this> {
    return this.edit({ locked, reason });
  }

  /** Join this thread. */
  async join(): Promise<void> {
    await this.client.rest.put(Routes.channelThreadMemberMe(this.id), { auth: true });
  }

  /** Leave this thread. */
  async leave(): Promise<void> {
    await this.client.rest.delete(Routes.channelThreadMemberMe(this.id), { auth: true });
  }

  /** Update the current user's notification settings for this thread. */
  async editSelf(options: ThreadMemberSettingsOptions): Promise<ThreadMember | null> {
    const data = await this.client.rest.patch<APIThreadMember | null>(
      Routes.channelThreadMemberMeSettings(this.id),
      { body: toThreadMemberSettingsBody(options), auth: true },
    );
    this.member = data ? new ThreadMember(data) : null;
    return this.member;
  }
}

/** List, add, and remove members of a {@link ThreadChannel}. */
export class ThreadMemberManager {
  constructor(private readonly thread: ThreadChannel) {}

  /** List members of this thread. */
  async fetch(options?: FetchThreadMembersOptions): Promise<ThreadMember[]> {
    const data = await this.thread.client.rest.get<APIThreadMember[]>(
      withQuery(Routes.channelThreadMembers(this.thread.id), {
        with_member: options?.withMember === undefined ? undefined : String(options.withMember),
        after: options?.after,
        limit: options?.limit,
      }),
    );
    return data.map((member) => new ThreadMember(member));
  }

  /** Fetch one member of this thread. */
  async fetchOne(userId: string, options?: { withMember?: boolean }): Promise<ThreadMember> {
    const data = await this.thread.client.rest.get<APIThreadMember>(
      withQuery(Routes.channelThreadMember(this.thread.id, userId), {
        with_member: options?.withMember === undefined ? undefined : String(options.withMember),
      }),
    );
    return new ThreadMember(data);
  }

  /** Add a user to this thread. Private threads only, unless the caller can manage the parent. */
  async add(userId: string): Promise<void> {
    await this.thread.client.rest.put(Routes.channelThreadMember(this.thread.id, userId), {
      auth: true,
    });
  }

  /** Remove a user from this thread. */
  async remove(userId: string): Promise<void> {
    await this.thread.client.rest.delete(Routes.channelThreadMember(this.thread.id, userId), {
      auth: true,
    });
  }
}

/** True for announcement, public, and private threads. */
export function isThreadType(type: number): boolean {
  return (
    type === ChannelType.AnnouncementThread ||
    type === ChannelType.PublicThread ||
    type === ChannelType.PrivateThread
  );
}
