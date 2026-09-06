import type { APIChannel, APIInvite, APIWebhook } from '@fluxerjs/types';
import { Routes } from '@fluxerjs/types';
import { PermissionFlags } from '@fluxerjs/util';
import type { Client } from '../../ClientCore/Client.js';
import {
  type ChannelEditOptions,
  type ChannelInviteCreateOptions,
  toChannelEditBody,
  toChannelInviteBody,
} from '../../ClientCore/SdkOptions/index.js';
import { Invite } from '../Invite.js';
import { Webhook } from '../Webhook.js';
import { Channel } from './Base.js';
import { PermissionOverwriteManager } from './PermissionOverwriteManager.js';
import { TextCapable } from './TextCapable.js';

/** A channel in a guild (text, voice, category, etc.). */
export class GuildChannel extends Channel {
  /** Guild ID this channel belongs to, or null if missing from the payload. */
  readonly guildId: string | null;
  declare name: string | null;
  /** Position in the channel list. */
  position?: number;
  /** Parent category ID, or null if none. */
  parentId: string | null;
  /** Permission overwrites for roles/members. */
  readonly permissionOverwrites: PermissionOverwriteManager;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.guildId = data.guild_id ?? null;
    this.name = data.name ?? null;
    this.position = data.position;
    this.parentId = data.parent_id ?? null;
    this.permissionOverwrites = new PermissionOverwriteManager(
      this,
      data.permission_overwrites ?? [],
    );
  }

  /**
   * Apply guild-channel fields in place.
   * @internal
   */
  override _patch(data: APIChannel): void {
    super._patch(data);
    if (data.name !== undefined) this.name = data.name ?? null;
    if (data.position !== undefined) this.position = data.position;
    if (data.parent_id !== undefined) this.parentId = data.parent_id ?? null;
    if (data.permission_overwrites !== undefined) {
      this.permissionOverwrites._patch(data.permission_overwrites ?? []);
    }
    this.applyEditPatch(data);
  }

  /** Create a webhook for this channel. Requires Manage Webhooks. */
  async createWebhook(options: { name: string; avatar?: string | null }): Promise<Webhook> {
    const data = await this.client.rest.post(Routes.channelWebhooks(this.id), {
      body: options,
      auth: true,
    });
    return new Webhook(this.client, data as APIWebhook);
  }

  /** Fetch all webhooks in this channel. Requires Manage Webhooks. */
  async fetchWebhooks(): Promise<Webhook[]> {
    const data = await this.client.rest.get<APIWebhook[]>(Routes.channelWebhooks(this.id));
    return data.map((w) => new Webhook(this.client, w));
  }

  /** Create an invite for this channel. Requires Create Instant Invite. */
  async createInvite(options?: ChannelInviteCreateOptions): Promise<Invite> {
    const body = options ? toChannelInviteBody(options) : {};
    const data = await this.client.rest.post(Routes.channelInvites(this.id), {
      body: Object.keys(body).length ? body : undefined,
      auth: true,
    });
    return new Invite(this.client, data as APIInvite);
  }

  /** Fetch all invites for this channel. Requires Manage Channels. */
  async fetchInvites(): Promise<Invite[]> {
    const data = await this.client.rest.get<APIInvite[]>(Routes.channelInvites(this.id));
    return data.map((i) => new Invite(this.client, i));
  }

  /** Check if the bot can send messages in this channel (cache-only; needs `members.me`). */
  override canSendMessage(): boolean {
    if (!this.guildId) return false;
    const me = this.client.guilds.get(this.guildId)?.members.me;
    if (!me) return false;
    const perms = me.permissionsIn(this);
    return perms.has(PermissionFlags.ViewChannel) && perms.has(PermissionFlags.SendMessages);
  }

  /**
   * Like {@link canSendMessage}, but hydrates `members.me` via REST when missing.
   * Returns false when the channel has no guildId.
   */
  async canSend(): Promise<boolean> {
    if (!this.guildId) return false;
    const guild = this.client.guilds.get(this.guildId);
    if (!guild) return false;
    if (!guild.members.me) {
      try {
        await guild.members.fetchMe();
      } catch {
        return false;
      }
    }
    return this.canSendMessage();
  }

  /** Edit this channel's settings. Requires Manage Channels. */
  async edit(options: ChannelEditOptions): Promise<this> {
    const data = await this.client.rest.patch<APIChannel>(Routes.channel(this.id), {
      body: toChannelEditBody(options),
      auth: true,
    });
    this.name = data.name ?? this.name;
    this.parentId = data.parent_id ?? this.parentId;
    if (data.permission_overwrites !== undefined) {
      this.permissionOverwrites._patch(data.permission_overwrites);
    }
    this.applyEditPatch(data);
    return this;
  }

  protected applyEditPatch(_data: APIChannel): void {}
}

/** A text channel in a guild (supports sending messages). */
export class TextChannel extends TextCapable(GuildChannel) {
  /** Channel topic. */
  topic?: string | null;
  /** Whether this channel is marked as NSFW. */
  nsfw?: boolean;
  /** Per-channel NSFW override (`null` inherits). */
  nsfwOverride?: boolean | null;
  /** Slowmode rate limit in seconds. */
  rateLimitPerUser?: number;
  /** ID of the last message sent in this channel. */
  lastMessageId?: string | null;
  /** Content warning level. */
  contentWarningLevel?: number | null;
  /** Custom content warning text. */
  contentWarningText?: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.topic = data.topic ?? null;
    this.nsfw = data.nsfw ?? false;
    this.nsfwOverride = data.nsfw_override ?? null;
    this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    this.lastMessageId = data.last_message_id ?? null;
    this.contentWarningLevel = data.content_warning_level ?? null;
    this.contentWarningText = data.content_warning_text ?? null;
  }

  /**
   * Set slowmode (seconds between messages). Pass `0` to disable.
   * Requires Manage Channels. Calls {@link GuildChannel.edit} with `rateLimitPerUser`.
   */
  async setSlowmode(seconds: number): Promise<this> {
    return this.edit({ rateLimitPerUser: seconds });
  }

  protected override applyEditPatch(data: APIChannel): void {
    if ('topic' in data) this.topic = data.topic ?? null;
    if ('nsfw' in data) this.nsfw = data.nsfw ?? false;
    if ('nsfw_override' in data) this.nsfwOverride = data.nsfw_override ?? null;
    if ('rate_limit_per_user' in data) this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    if ('last_message_id' in data) this.lastMessageId = data.last_message_id ?? null;
    if ('content_warning_level' in data) {
      this.contentWarningLevel = data.content_warning_level ?? null;
    }
    if ('content_warning_text' in data) {
      this.contentWarningText = data.content_warning_text ?? null;
    }
  }
}

/** A category channel (container for organizing channels). */
export class CategoryChannel extends GuildChannel {}

/** A voice channel in a guild. Voice is text-capable on Fluxer. */
export class VoiceChannel extends TextCapable(GuildChannel) {
  /** Guild ID. Voice channels always belong to a guild. */
  declare readonly guildId: string;
  /** Channel topic. */
  topic?: string | null;
  /** Whether this channel is marked as NSFW. */
  nsfw?: boolean;
  /** Per-channel NSFW override (`null` inherits). */
  nsfwOverride?: boolean | null;
  /** Slowmode rate limit in seconds. */
  rateLimitPerUser?: number;
  /** ID of the last message sent in this channel. */
  lastMessageId?: string | null;
  /** Content warning level. */
  contentWarningLevel?: number | null;
  /** Custom content warning text. */
  contentWarningText?: string | null;
  /** Voice bitrate. */
  bitrate?: number | null;
  /** Maximum number of users allowed. */
  userLimit?: number | null;
  /** Max active voice connections per user. */
  voiceConnectionLimit?: number | null;
  /** RTC region override for this channel. */
  rtcRegion?: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.topic = data.topic ?? null;
    this.nsfw = data.nsfw ?? false;
    this.nsfwOverride = data.nsfw_override ?? null;
    this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    this.lastMessageId = data.last_message_id ?? null;
    this.contentWarningLevel = data.content_warning_level ?? null;
    this.contentWarningText = data.content_warning_text ?? null;
    this.bitrate = data.bitrate ?? null;
    this.userLimit = data.user_limit ?? null;
    this.voiceConnectionLimit = data.voice_connection_limit ?? null;
    this.rtcRegion = data.rtc_region ?? null;
  }

  /**
   * Set slowmode (seconds between messages). Pass `0` to disable.
   * Requires Manage Channels. Calls {@link GuildChannel.edit} with `rateLimitPerUser`.
   */
  async setSlowmode(seconds: number): Promise<this> {
    return this.edit({ rateLimitPerUser: seconds });
  }

  protected override applyEditPatch(data: APIChannel): void {
    if ('topic' in data) this.topic = data.topic ?? null;
    if ('nsfw' in data) this.nsfw = data.nsfw ?? false;
    if ('nsfw_override' in data) this.nsfwOverride = data.nsfw_override ?? null;
    if ('rate_limit_per_user' in data) this.rateLimitPerUser = data.rate_limit_per_user ?? 0;
    if ('last_message_id' in data) this.lastMessageId = data.last_message_id ?? null;
    if ('content_warning_level' in data) {
      this.contentWarningLevel = data.content_warning_level ?? null;
    }
    if ('content_warning_text' in data) {
      this.contentWarningText = data.content_warning_text ?? null;
    }
    if ('bitrate' in data) this.bitrate = data.bitrate ?? null;
    if ('user_limit' in data) this.userLimit = data.user_limit ?? null;
    if ('voice_connection_limit' in data) {
      this.voiceConnectionLimit = data.voice_connection_limit ?? null;
    }
    if ('rtc_region' in data) this.rtcRegion = data.rtc_region ?? null;
  }
}

/** A link channel (redirects to an external URL). */
export class LinkChannel extends GuildChannel {
  /** External URL this channel links to. */
  url: string | null;

  constructor(client: Client, data: APIChannel) {
    super(client, data);
    this.url = data.url ?? null;
  }

  protected override applyEditPatch(data: APIChannel): void {
    if ('url' in data) this.url = data.url ?? null;
  }
}
