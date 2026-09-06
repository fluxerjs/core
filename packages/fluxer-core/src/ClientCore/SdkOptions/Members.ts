/** Guild member search / edit SDK options. */

/** Filters and paging for {@link Guild.searchMembers}. */
export interface GuildMemberSearchOptions {
  query?: string;
  limit?: number;
  offset?: number;
  roleIds?: string[];
  joinedAtGte?: number;
  joinedAtLte?: number;
  isBot?: boolean;
  userCreatedAtGte?: number;
  userCreatedAtLte?: number;
  sortBy?: 'joinedAt' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  joinSourceType?: number[];
  sourceInviteCode?: string[];
}

/** Convert {@link GuildMemberSearchOptions} to the wire search body. */
export function toMemberSearchBody(options: GuildMemberSearchOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.query !== undefined) body.query = options.query;
  if (options.limit !== undefined) body.limit = options.limit;
  if (options.offset !== undefined) body.offset = options.offset;
  if (options.roleIds !== undefined) body.role_ids = options.roleIds;
  if (options.joinedAtGte !== undefined) body.joined_at_gte = options.joinedAtGte;
  if (options.joinedAtLte !== undefined) body.joined_at_lte = options.joinedAtLte;
  if (options.isBot !== undefined) body.is_bot = options.isBot;
  if (options.userCreatedAtGte !== undefined) body.user_created_at_gte = options.userCreatedAtGte;
  if (options.userCreatedAtLte !== undefined) body.user_created_at_lte = options.userCreatedAtLte;
  if (options.sortBy !== undefined) body.sort_by = options.sortBy;
  if (options.sortOrder !== undefined) body.sort_order = options.sortOrder;
  if (options.joinSourceType !== undefined) body.join_source_type = options.joinSourceType;
  if (options.sourceInviteCode !== undefined) body.source_invite_code = options.sourceInviteCode;
  return body;
}

/** Fields to update on a guild member (nick, roles, profile, voice/timeout state). */
export interface GuildMemberEditOptions {
  nick?: string | null;
  roles?: string[];
  avatar?: string | null;
  banner?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  accentColor?: number | null;
  profileFlags?: number | null;
  mentionFlags?: number | null;
  mute?: boolean;
  deaf?: boolean;
  communicationDisabledUntil?: string | null;
  timeoutReason?: string | null;
  channelId?: string | null;
  connectionId?: string | null;
}

/** Convert {@link GuildMemberEditOptions} to the member PATCH wire body. */
export function toMemberEditBody(options: GuildMemberEditOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (options.nick !== undefined) body.nick = options.nick;
  if (options.roles !== undefined) body.roles = options.roles;
  if (options.avatar !== undefined) body.avatar = options.avatar;
  if (options.banner !== undefined) body.banner = options.banner;
  if (options.bio !== undefined) body.bio = options.bio;
  if (options.pronouns !== undefined) body.pronouns = options.pronouns;
  if (options.accentColor !== undefined) body.accent_color = options.accentColor;
  if (options.profileFlags !== undefined) body.profile_flags = options.profileFlags;
  if (options.mentionFlags !== undefined) body.mention_flags = options.mentionFlags;
  if (options.mute !== undefined) body.mute = options.mute;
  if (options.deaf !== undefined) body.deaf = options.deaf;
  if (options.communicationDisabledUntil !== undefined) {
    body.communication_disabled_until = options.communicationDisabledUntil;
  }
  if (options.timeoutReason !== undefined) body.timeout_reason = options.timeoutReason;
  if (options.channelId !== undefined) body.channel_id = options.channelId;
  if (options.connectionId !== undefined) body.connection_id = options.connectionId;
  return body;
}
