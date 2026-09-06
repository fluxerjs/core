/** Channel edit / invite / RTC / slowmode SDK options. */

import type { ChannelType, OverwriteType } from '@fluxerjs/types';
import { type PermissionResolvable, resolvePermissionsToBitfield } from '@fluxerjs/util';

/** A single permission overwrite for channel create/edit (`allow`/`deny` as {@link PermissionResolvable}). */
export interface ChannelPermissionOverwriteOptions {
  id: string;
  type: OverwriteType;
  allow?: PermissionResolvable;
  deny?: PermissionResolvable;
}

function toOverwriteWire(overwrite: ChannelPermissionOverwriteOptions): {
  id: string;
  type: OverwriteType;
  allow: string;
  deny: string;
} {
  return {
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow !== undefined ? resolvePermissionsToBitfield(overwrite.allow) : '0',
    deny: overwrite.deny !== undefined ? resolvePermissionsToBitfield(overwrite.deny) : '0',
  };
}

/** Options for {@link GuildChannel.edit}. */
export interface ChannelEditOptions {
  name?: string | null;
  topic?: string | null;
  url?: string | null;
  parentId?: string | null;
  bitrate?: number | null;
  userLimit?: number | null;
  voiceConnectionLimit?: number | null;
  nsfw?: boolean;
  nsfwOverride?: boolean | null;
  contentWarningLevel?: number | null;
  contentWarningText?: string | null;
  rateLimitPerUser?: number;
  rtcRegion?: string | null;
  permissionOverwrites?: ChannelPermissionOverwriteOptions[];
  /** Group DM icon hash (base64 image). */
  icon?: string | null;
}

/** Options for {@link Guild.createChannel}. */
export interface GuildChannelCreateOptions {
  name: string;
  type: ChannelType;
  topic?: string | null;
  url?: string | null;
  parentId?: string | null;
  bitrate?: number | null;
  userLimit?: number | null;
  voiceConnectionLimit?: number | null;
  permissionOverwrites?: ChannelPermissionOverwriteOptions[];
  nsfw?: boolean;
  nsfwOverride?: boolean | null;
  contentWarningLevel?: number | null;
  contentWarningText?: string | null;
  rateLimitPerUser?: number | null;
}

/** Convert {@link ChannelEditOptions} to the channel PATCH wire body. */
export function toChannelEditBody(options: ChannelEditOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.name !== undefined) body.name = options.name;
  if (options.topic !== undefined) body.topic = options.topic;
  if (options.url !== undefined) body.url = options.url;
  if (options.parentId !== undefined) body.parent_id = options.parentId;
  if (options.bitrate !== undefined) body.bitrate = options.bitrate;
  if (options.userLimit !== undefined) body.user_limit = options.userLimit;
  if (options.voiceConnectionLimit !== undefined) {
    body.voice_connection_limit = options.voiceConnectionLimit;
  }
  if (options.nsfw !== undefined) body.nsfw = options.nsfw;
  if (options.nsfwOverride !== undefined) body.nsfw_override = options.nsfwOverride;
  if (options.contentWarningLevel !== undefined) {
    body.content_warning_level = options.contentWarningLevel;
  }
  if (options.contentWarningText !== undefined) {
    body.content_warning_text = options.contentWarningText;
  }
  if (options.rateLimitPerUser !== undefined) {
    body.rate_limit_per_user = options.rateLimitPerUser;
  }
  if (options.rtcRegion !== undefined) body.rtc_region = options.rtcRegion;
  if (options.icon !== undefined) body.icon = options.icon;
  if (options.permissionOverwrites !== undefined) {
    body.permission_overwrites = options.permissionOverwrites.map(toOverwriteWire);
  }
  return body;
}

/** Convert {@link GuildChannelCreateOptions} to the channel POST wire body. */
export function toChannelCreateBody(options: GuildChannelCreateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { name: options.name, type: options.type };
  if (options.topic !== undefined) body.topic = options.topic;
  if (options.url !== undefined) body.url = options.url;
  if (options.parentId !== undefined) body.parent_id = options.parentId;
  if (options.bitrate !== undefined) body.bitrate = options.bitrate;
  if (options.userLimit !== undefined) body.user_limit = options.userLimit;
  if (options.voiceConnectionLimit !== undefined) {
    body.voice_connection_limit = options.voiceConnectionLimit;
  }
  if (options.permissionOverwrites !== undefined) {
    body.permission_overwrites = options.permissionOverwrites.map(toOverwriteWire);
  }
  if (options.nsfw !== undefined) body.nsfw = options.nsfw;
  if (options.nsfwOverride !== undefined) body.nsfw_override = options.nsfwOverride;
  if (options.contentWarningLevel !== undefined) {
    body.content_warning_level = options.contentWarningLevel;
  }
  if (options.contentWarningText !== undefined) {
    body.content_warning_text = options.contentWarningText;
  }
  if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;
  return body;
}

/** Options for {@link GuildChannel.createInvite}. */
export interface ChannelInviteCreateOptions {
  maxUses?: number;
  maxAge?: number;
  unique?: boolean;
  temporary?: boolean;
}

/** Convert {@link ChannelInviteCreateOptions} to the invite create wire body. */
export function toChannelInviteBody(options: ChannelInviteCreateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.maxUses !== undefined) body.max_uses = options.maxUses;
  if (options.maxAge !== undefined) body.max_age = options.maxAge;
  if (options.unique !== undefined) body.unique = options.unique;
  if (options.temporary !== undefined) body.temporary = options.temporary;
  return body;
}

/** Options for {@link DMChannel.edit} (group DM name/icon/nicks). */
export interface GroupDmEditOptions {
  name?: string | null;
  icon?: string | null;
  nicks?: Record<string, string> | null;
}

/** Convert {@link GroupDmEditOptions} to GroupDmChannelUpdateRequest. */
export function toGroupDmEditBody(options: GroupDmEditOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { type: 3 };
  if (options.name !== undefined) body.name = options.name;
  if (options.icon !== undefined) body.icon = options.icon;
  if (options.nicks !== undefined) body.nicks = options.nicks;
  return body;
}

export interface RtcRegionPayload {
  id: string;
  name: string;
  emoji: string;
}

/** CamelCase slowmode state from {@link Channel.fetchSlowmode}. */
export interface ChannelSlowmodePayload {
  rateLimitPerUser: number;
  retryAfterMs: number;
  nextSendAllowedAt: string | null;
}
