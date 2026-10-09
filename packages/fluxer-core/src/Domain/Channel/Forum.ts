import type { APIChannel, APIDefaultReactionEmoji, APIForumTag } from '@fluxerjs/types';
import {
  ChannelType,
  type ForumLayout,
  type ForumSortOrder,
  type ForumTagSetting,
  Routes,
} from '@fluxerjs/types';
import type { Client } from '../../ClientCore/Client.js';
import {
  type DefaultReactionEmojiInput,
  type ForumAvailableTag,
  type ForumParentEditOptions,
  type ForumTagOptions,
  forumParentWire,
  type ThreadParentEditOptions,
  toChannelEditBody,
  toForumTagBody,
  toThreadParentEditBody,
} from '../../ClientCore/SdkOptions/index.js';
import { auditReasonHeaders } from '../../Helpers/AuditReason.js';
import { GuildChannel } from './Guild.js';
import { ThreadManager } from './ThreadManager.js';

function tagsFrom(data: APIForumTag[] | undefined): APIForumTag[] {
  return data ?? [];
}

/**
 * A channel whose only contents are threads (forum posts or media posts).
 * Create a post with {@link ThreadManager.createPost}.
 */
class ThreadOnlyChannel extends GuildChannel {
  /** Tags that can be applied to posts. */
  availableTags: APIForumTag[];
  /** Default reaction for new posts. */
  defaultReactionEmoji: APIDefaultReactionEmoji | null;
  /** Default sort order for posts. */
  defaultSortOrder: ForumSortOrder | null;
  /** How posts are filtered when searching by several tags. */
  defaultTagSetting: ForumTagSetting | null;
  /** Default auto-archive duration in minutes for new posts. */
  defaultAutoArchiveDuration: number | null;
  /** Slowmode in seconds copied onto new posts. */
  defaultThreadRateLimitPerUser: number | null;
  /** Channel flags bitfield. */
  flags: number;
  /** Create, list, and search posts in this channel. */
  readonly threads: ThreadManager;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.availableTags = tagsFrom(data.available_tags);
    this.defaultReactionEmoji = data.default_reaction_emoji ?? null;
    this.defaultSortOrder = data.default_sort_order ?? null;
    this.defaultTagSetting = data.default_tag_setting ?? null;
    this.defaultAutoArchiveDuration = data.default_auto_archive_duration ?? null;
    this.defaultThreadRateLimitPerUser = data.default_thread_rate_limit_per_user ?? null;
    this.flags = data.flags ?? 0;
    this.threads = new ThreadManager(this);
  }

  /** @internal */
  override _patch(data: APIChannel): void {
    super._patch(data);
    if (data.available_tags !== undefined) this.availableTags = tagsFrom(data.available_tags);
    if ('default_reaction_emoji' in data) {
      this.defaultReactionEmoji = data.default_reaction_emoji ?? null;
    }
    if ('default_sort_order' in data) this.defaultSortOrder = data.default_sort_order ?? null;
    if ('default_tag_setting' in data) this.defaultTagSetting = data.default_tag_setting ?? null;
    if ('default_auto_archive_duration' in data) {
      this.defaultAutoArchiveDuration = data.default_auto_archive_duration ?? null;
    }
    if ('default_thread_rate_limit_per_user' in data) {
      this.defaultThreadRateLimitPerUser = data.default_thread_rate_limit_per_user ?? null;
    }
    if (data.flags !== undefined) this.flags = data.flags;
  }

  /**
   * Edit this channel.
   * Tag, sort, reaction, and thread-default fields are sent with the usual channel fields.
   * `defaultForumLayout` is sent only for forum channels.
   */
  override async edit(options: ForumParentEditOptions): Promise<this> {
    const data = await this.client.rest.patch<APIChannel>(Routes.channel(this.id), {
      body: {
        ...toChannelEditBody(options),
        ...forumParentWire(options, this.type === ChannelType.GuildForum),
      },
      auth: true,
      ...auditReasonHeaders(options.reason),
    });
    this._patch(data);
    return this;
  }

  /** Replace the tags that can be applied to posts (max 20). */
  async setAvailableTags(tags: ForumAvailableTag[], reason?: string): Promise<this> {
    return this.edit({ availableTags: tags, reason });
  }

  /** Set or clear the default reaction on new posts. */
  async setDefaultReactionEmoji(
    emoji: DefaultReactionEmojiInput | null,
    reason?: string,
  ): Promise<this> {
    return this.edit({ defaultReactionEmoji: emoji, reason });
  }

  /** Set or clear the default post sort order. */
  async setDefaultSortOrder(order: ForumSortOrder | null, reason?: string): Promise<this> {
    return this.edit({ defaultSortOrder: order, reason });
  }

  /** Set or clear how posts match when several tags are selected. */
  async setDefaultTagSetting(setting: ForumTagSetting | null, reason?: string): Promise<this> {
    return this.edit({ defaultTagSetting: setting, reason });
  }

  /** Set the auto-archive and slowmode defaults copied onto new posts. */
  async editThreadDefaults(options: ThreadParentEditOptions): Promise<this> {
    const data = await this.client.rest.patch<APIChannel>(Routes.channel(this.id), {
      body: toThreadParentEditBody(options),
      auth: true,
      ...auditReasonHeaders(options.reason),
    });
    this._patch(data);
    return this;
  }

  /** Create a tag. The response replaces {@link availableTags}. */
  async createTag(options: ForumTagOptions): Promise<this> {
    const data = await this.client.rest.post<APIChannel>(Routes.channelTags(this.id), {
      body: toForumTagBody(options),
      auth: true,
      ...auditReasonHeaders(options.reason),
    });
    this._patch(data);
    return this;
  }

  /** Replace a tag. The response replaces {@link availableTags}. */
  async editTag(tagId: string, options: ForumTagOptions): Promise<this> {
    const data = await this.client.rest.put<APIChannel>(Routes.channelTag(this.id, tagId), {
      body: toForumTagBody(options),
      auth: true,
      ...auditReasonHeaders(options.reason),
    });
    this._patch(data);
    return this;
  }

  /** Delete a tag. The response replaces {@link availableTags}. */
  async deleteTag(tagId: string, reason?: string): Promise<this> {
    const data = await this.client.rest.delete<APIChannel>(Routes.channelTag(this.id, tagId), {
      auth: true,
      ...auditReasonHeaders(reason),
    });
    this._patch(data);
    return this;
  }
}

/** A forum channel (type 15). Posts are public threads. */
export class ForumChannel extends ThreadOnlyChannel {
  /** Default layout for posts. */
  defaultForumLayout: ForumLayout | null;

  /** Set or clear the default post layout. */
  async setDefaultForumLayout(layout: ForumLayout | null, reason?: string): Promise<this> {
    return this.edit({ defaultForumLayout: layout, reason });
  }

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.defaultForumLayout = data.default_forum_layout ?? null;
  }

  /** @internal */
  override _patch(data: APIChannel): void {
    super._patch(data);
    if ('default_forum_layout' in data) this.defaultForumLayout = data.default_forum_layout ?? null;
  }
}

/** A media channel (type 16). Posts are public threads shown as a gallery. */
export class MediaChannel extends ThreadOnlyChannel {}
