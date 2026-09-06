/** Guild REST wire body serializers. */
import { type PermissionResolvable, resolvePermissionsToBitfield } from '@fluxerjs/util';
import type { RoleCreateOptions, RoleEditOptions } from '../../Domain/Guild/RoleOptions.js';
import type {
  ChannelPositionUpdate,
  GuildBanOptions,
  GuildEditOptions,
} from '../../Domain/Guild/Types.js';

/** Serialize {@link GuildEditOptions} to OpenAPI guild update body. */
export function toGuildEditBody(options: GuildEditOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.name !== undefined) body.name = options.name;
  if (options.icon !== undefined) body.icon = options.icon;
  if (options.systemChannelId !== undefined) body.system_channel_id = options.systemChannelId;
  if (options.systemChannelFlags !== undefined) {
    body.system_channel_flags = options.systemChannelFlags;
  }
  if (options.afkChannelId !== undefined) body.afk_channel_id = options.afkChannelId;
  if (options.afkTimeout !== undefined) body.afk_timeout = options.afkTimeout;
  if (options.defaultMessageNotifications !== undefined) {
    body.default_message_notifications = options.defaultMessageNotifications;
  }
  if (options.verificationLevel !== undefined) {
    body.verification_level = options.verificationLevel;
  }
  if (options.mfaLevel !== undefined) body.mfa_level = options.mfaLevel;
  if (options.explicitContentFilter !== undefined) {
    body.explicit_content_filter = options.explicitContentFilter;
  }
  if (options.banner !== undefined) body.banner = options.banner;
  if (options.splash !== undefined) body.splash = options.splash;
  if (options.embedSplash !== undefined) body.embed_splash = options.embedSplash;
  if (options.splashCardAlignment !== undefined) {
    body.splash_card_alignment = options.splashCardAlignment;
  }
  if (options.nsfwLevel !== undefined) body.nsfw_level = options.nsfwLevel;
  if (options.nsfw !== undefined) body.nsfw = options.nsfw;
  if (options.contentWarningLevel !== undefined) {
    body.content_warning_level = options.contentWarningLevel;
  }
  if (options.contentWarningText !== undefined) {
    body.content_warning_text = options.contentWarningText;
  }
  if (options.messageHistoryCutoff !== undefined) {
    body.message_history_cutoff = options.messageHistoryCutoff;
  }
  if (options.features !== undefined) body.features = options.features;
  return body;
}

export function toGuildBanBody(options: GuildBanOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.reason !== undefined) body.reason = options.reason;
  if (options.deleteMessageDays !== undefined) {
    body.delete_message_days = options.deleteMessageDays;
  }
  if (options.deleteMessageSeconds !== undefined) {
    body.delete_message_seconds = options.deleteMessageSeconds;
  }
  if (options.banDurationSeconds !== undefined) {
    body.ban_duration_seconds = options.banDurationSeconds;
  }
  return body;
}

export function toChannelPositionBody(
  updates: ChannelPositionUpdate[],
): Array<Record<string, unknown>> {
  return updates.map((u) => {
    const row: Record<string, unknown> = { id: u.id };
    if (u.position !== undefined) row.position = u.position;
    if (u.parentId !== undefined) row.parent_id = u.parentId;
    if (u.lockPermissions !== undefined) row.lock_permissions = u.lockPermissions;
    return row;
  });
}

function toRolePermissionsBody(options: {
  permissions?: string | PermissionResolvable;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.permissions !== undefined) {
    body.permissions =
      typeof options.permissions === 'string'
        ? options.permissions
        : resolvePermissionsToBitfield(options.permissions);
  }
  return body;
}

/** Convert SDK role create options to GuildRoleCreateRequest. */
export function toRoleCreateBody(options: RoleCreateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { ...toRolePermissionsBody(options) };
  if (options.name !== undefined) body.name = options.name;
  if (options.color !== undefined) body.color = options.color;
  return body;
}

/** Convert SDK role edit options to GuildRoleUpdateRequest. */
export function toRoleEditBody(options: RoleEditOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { ...toRolePermissionsBody(options) };
  if (options.name !== undefined) body.name = options.name;
  if (options.color !== undefined) body.color = options.color;
  if (options.hoist !== undefined) body.hoist = options.hoist;
  if (options.mentionable !== undefined) body.mentionable = options.mentionable;
  if (options.hoistPosition !== undefined) body.hoist_position = options.hoistPosition;
  return body;
}
