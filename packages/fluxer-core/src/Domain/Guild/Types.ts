import type {
  APIGuild,
  APIRole,
  ContentWarningLevel,
  DefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildFeature,
  GuildMFALevel,
  GuildNSFWLevel,
  GuildVerificationLevel,
  SplashCardAlignment,
  SystemChannelFlagsValue,
} from '@fluxerjs/types';

export type GuildData = Partial<APIGuild> & {
  id: string;
  roles?: APIRole[];
  ownerId?: string;
};

/** CamelCase SDK options for PATCH /guilds/{id}. */
export type GuildEditOptions = {
  name?: string;
  icon?: string | null;
  systemChannelId?: string | null;
  systemChannelFlags?: number | SystemChannelFlagsValue;
  afkChannelId?: string | null;
  afkTimeout?: number;
  defaultMessageNotifications?: DefaultMessageNotifications;
  verificationLevel?: GuildVerificationLevel;
  mfaLevel?: GuildMFALevel;
  explicitContentFilter?: GuildExplicitContentFilter;
  banner?: string | null;
  splash?: string | null;
  embedSplash?: string | null;
  splashCardAlignment?: SplashCardAlignment;
  nsfwLevel?: GuildNSFWLevel;
  /** Distinct from {@link nsfwLevel}: adult (18+) flag. */
  nsfw?: boolean;
  contentWarningLevel?: ContentWarningLevel;
  contentWarningText?: string | null;
  messageHistoryCutoff?: string | null;
  features?: GuildFeature[];
};

export type GuildBanOptions = {
  reason?: string;
  /** Delete message history for this many days (0–7). Deprecated in favor of deleteMessageSeconds. */
  deleteMessageDays?: number;
  /** Delete message history for this many seconds (0–604800). */
  deleteMessageSeconds?: number;
  /** Temporary ban duration in seconds. */
  banDurationSeconds?: number;
};

export type ChannelPositionUpdate = {
  id: string;
  position?: number;
  parentId?: string | null;
  lockPermissions?: boolean;
};
