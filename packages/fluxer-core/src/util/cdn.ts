import { CDN_URL } from './Constants.js';

export interface CdnUrlOptions {
  size?: number;
  extension?: string;
}

function getExtension(hash: string | null, options?: CdnUrlOptions): string {
  const ext = options?.extension ?? 'png';
  // Animated avatars/banners have hash starting with a_
  if (hash?.startsWith('a_')) return 'gif';
  return ext;
}

function appendSize(options?: CdnUrlOptions): string {
  return options?.size ? `?size=${options.size}` : '';
}

/**
 * Build a user avatar URL from raw API data.
 * @param userId - The user's snowflake ID
 * @param avatarHash - The avatar hash from the API, or null if no custom avatar
 * @param options - Optional size and extension (default: png; auto-detects gif for a_ hashes)
 * @returns The avatar URL, or null if no avatar hash
 * @example
 * const url = cdnAvatarURL(userData.id, userData.avatar, { size: 256 });
 */
export function cdnAvatarURL(
  userId: string,
  avatarHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!avatarHash) return null;
  const ext = getExtension(avatarHash, options);
  const size = appendSize(options);
  return `${CDN_URL}/avatars/${userId}/${avatarHash}.${ext}${size}`;
}

/**
 * Build an avatar URL, or the default avatar when none set.
 * @param userId - The user's snowflake ID
 * @param avatarHash - The avatar hash from the API, or null
 * @param options - Optional size and extension
 * @returns The avatar URL (never null)
 * @example
 * const url = cdnDisplayAvatarURL(user.id, user.avatar, { size: 64 });
 */
export function cdnDisplayAvatarURL(
  userId: string,
  avatarHash: string | null,
  options?: CdnUrlOptions,
): string {
  return cdnAvatarURL(userId, avatarHash, options) ?? `${CDN_URL}/avatars/0/0.png`;
}

/**
 * Build a user or guild banner URL from raw API data.
 * @param resourceId - The user ID or guild ID
 * @param bannerHash - The banner hash from the API, or null
 * @param options - Optional size and extension (default: png; auto-detects gif for a_ hashes)
 * @returns The banner URL, or null if no banner
 * @example
 * const url = cdnBannerURL(userData.id, profile.banner, { size: 512 });
 */
export function cdnBannerURL(
  resourceId: string,
  bannerHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!bannerHash) return null;
  const ext = getExtension(bannerHash, options);
  const size = appendSize(options);
  return `${CDN_URL}/banners/${resourceId}/${bannerHash}.${ext}${size}`;
}

/**
 * Build a guild member avatar URL (guild-specific avatar).
 * @param guildId - The guild ID
 * @param userId - The user ID
 * @param avatarHash - The member avatar hash, or null
 * @param options - Optional size and extension
 * @returns The member avatar URL, or null if no guild avatar
 * @example
 * const url = cdnMemberAvatarURL(member.guild.id, member.id, member.avatar);
 */
export function cdnMemberAvatarURL(
  guildId: string,
  userId: string,
  avatarHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!avatarHash) return null;
  const ext = getExtension(avatarHash, options);
  const size = appendSize(options);
  return `${CDN_URL}/guilds/${guildId}/users/${userId}/avatars/${avatarHash}.${ext}${size}`;
}

/**
 * Build a guild member banner URL (guild-specific banner).
 * @param guildId - The guild ID
 * @param userId - The user ID
 * @param bannerHash - The member banner hash, or null
 * @param options - Optional size and extension
 * @returns The member banner URL, or null if no guild banner
 */
export function cdnMemberBannerURL(
  guildId: string,
  userId: string,
  bannerHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!bannerHash) return null;
  const ext = getExtension(bannerHash, options);
  const size = appendSize(options);
  return `${CDN_URL}/guilds/${guildId}/users/${userId}/banners/${bannerHash}.${ext}${size}`;
}

/**
 * Get the default avatar URL (used when user has no custom avatar).
 * @param discriminatorIndex - Optional index 0-4 for default avatar variant
 * @returns The default avatar URL
 */
export function cdnDefaultAvatarURL(discriminatorIndex?: number): string {
  const index = discriminatorIndex != null ? discriminatorIndex % 5 : 0;
  return `${CDN_URL}/avatars/0/${index}.png`;
}
