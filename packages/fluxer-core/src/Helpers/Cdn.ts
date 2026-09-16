import { CDN_URL, STATIC_CDN_URL } from './Constants.js';

export interface CdnUrlOptions {
  size?: number;
  extension?: string;
  /** Media CDN base (avatars, banners, emojis). Defaults to hosted Fluxer. */
  mediaBase?: string;
  /** Static CDN base (default avatars). Defaults to hosted Fluxer. */
  staticCdnBase?: string;
}

/** Media proxy `size` ladder (generated URLs must match cache keys). */
export const CDN_SIZE_LADDER = [
  16, 20, 22, 24, 28, 32, 40, 44, 48, 56, 60, 64, 80, 96, 100, 128, 160, 240, 256, 300, 320, 480,
  512, 600, 640, 1024, 1280, 1536, 2048, 3072, 4096, 8192, 16384,
] as const;

/** Asset class used to clamp a snapped `size` query. */
export type CdnAssetClass = 'icon' | 'banner' | 'emoji' | 'sticker';

const CDN_ASSET_CLASS_RANGE: Record<CdnAssetClass, { min: number; max: number }> = {
  icon: { min: 128, max: 1024 },
  banner: { min: 480, max: 2400 },
  emoji: { min: 32, max: 512 },
  sticker: { min: 128, max: 512 },
};

function nearestSize(requested: number, candidates: readonly number[]): number {
  let best = candidates[0]!;
  let bestDist = Math.abs(requested - best);
  for (let i = 1; i < candidates.length; i++) {
    const step = candidates[i]!;
    const dist = Math.abs(requested - step);
    if (dist < bestDist || (dist === bestDist && step > best)) {
      best = step;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Snap `size` to the media-proxy ladder, then clamp to the asset class range.
 * Banner max 2400 is not on the ladder; the largest ladder value at or below 2400 is used.
 */
export function snapCdnSize(requested: number, assetClass: CdnAssetClass): number {
  const { min, max } = CDN_ASSET_CLASS_RANGE[assetClass];
  const snapped = nearestSize(requested, CDN_SIZE_LADDER);
  const clamped = Math.min(max, Math.max(min, snapped));
  const allowed = CDN_SIZE_LADDER.filter((step) => step >= min && step <= max);
  return nearestSize(clamped, allowed);
}

function mediaBase(options?: CdnUrlOptions): string {
  return (options?.mediaBase ?? CDN_URL).replace(/\/+$/, '');
}

function staticBase(options?: CdnUrlOptions): string {
  return (options?.staticCdnBase ?? STATIC_CDN_URL).replace(/\/+$/, '');
}

function getExtension(hash: string | null, options?: CdnUrlOptions): string {
  const ext = options?.extension ?? 'png';
  // Animated avatars/banners have hash starting with a_
  if (hash?.startsWith('a_')) return 'gif';
  return ext;
}

function appendSize(options: CdnUrlOptions | undefined, assetClass: CdnAssetClass): string {
  const size = options?.size;
  if (size == null || !Number.isFinite(size) || size <= 0) return '';
  return `?size=${snapCdnSize(size, assetClass)}`;
}

/**
 * Build a user avatar URL from raw API data.
 * @param userId - The user's snowflake ID
 * @param avatarHash - The avatar hash from the API, or null if no custom avatar
 * @param options - Optional size, extension, and CDN bases
 * @returns The avatar URL, or null if no avatar hash
 */
export function cdnAvatarURL(
  userId: string,
  avatarHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!avatarHash) return null;
  const ext = getExtension(avatarHash, options);
  const size = appendSize(options, 'icon');
  return `${mediaBase(options)}/avatars/${userId}/${avatarHash}.${ext}${size}`;
}

/**
 * Build an avatar URL, or the default avatar when none set.
 */
export function cdnDisplayAvatarURL(
  userId: string,
  avatarHash: string | null,
  options?: CdnUrlOptions,
): string {
  return cdnAvatarURL(userId, avatarHash, options) ?? cdnDefaultAvatarURL(userId, options);
}

/**
 * Build a user or guild banner URL from raw API data.
 */
export function cdnBannerURL(
  resourceId: string,
  bannerHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!bannerHash) return null;
  const ext = getExtension(bannerHash, options);
  const size = appendSize(options, 'banner');
  return `${mediaBase(options)}/banners/${resourceId}/${bannerHash}.${ext}${size}`;
}

/**
 * Build a guild member avatar URL (guild-specific avatar).
 */
export function cdnMemberAvatarURL(
  guildId: string,
  userId: string,
  avatarHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!avatarHash) return null;
  const ext = getExtension(avatarHash, options);
  const size = appendSize(options, 'icon');
  return `${mediaBase(options)}/guilds/${guildId}/users/${userId}/avatars/${avatarHash}.${ext}${size}`;
}

/**
 * Build a guild member banner URL (guild-specific banner).
 */
export function cdnMemberBannerURL(
  guildId: string,
  userId: string,
  bannerHash: string | null,
  options?: CdnUrlOptions,
): string | null {
  if (!bannerHash) return null;
  const ext = getExtension(bannerHash, options);
  const size = appendSize(options, 'banner');
  return `${mediaBase(options)}/guilds/${guildId}/users/${userId}/banners/${bannerHash}.${ext}${size}`;
}

/**
 * Get the default avatar URL (used when user has no custom avatar).
 * Fluxer uses index = userId % 6 (six default avatar variants).
 */
export function cdnDefaultAvatarURL(
  userIdOrIndex: string | number,
  options?: Pick<CdnUrlOptions, 'staticCdnBase'>,
): string {
  const index =
    typeof userIdOrIndex === 'string'
      ? Number(BigInt(userIdOrIndex) % 6n)
      : Math.abs(Math.floor(userIdOrIndex) % 6);
  return `${staticBase(options)}/avatars/${index}.png`;
}

/** Build a guild icon/banner/splash URL. */
export function cdnGuildAssetURL(
  kind: 'icons' | 'banners' | 'splashes',
  id: string,
  hash: string | null,
  options?: Pick<CdnUrlOptions, 'size' | 'mediaBase'>,
): string | null {
  if (!hash) return null;
  const assetClass: CdnAssetClass = kind === 'icons' ? 'icon' : 'banner';
  const size = appendSize(options, assetClass);
  return `${mediaBase(options)}/${kind}/${id}/${hash}.png${size}`;
}

/** Build an emoji CDN URL. */
export function cdnEmojiURL(
  emojiId: string,
  animated: boolean,
  options?: Pick<CdnUrlOptions, 'size' | 'mediaBase'>,
): string {
  const ext = animated ? 'gif' : 'png';
  const size = appendSize(options, 'emoji');
  return `${mediaBase(options)}/emojis/${emojiId}.${ext}${size}`;
}

/** Build a sticker CDN URL. */
export function cdnStickerURL(
  stickerId: string,
  animated: boolean,
  options?: Pick<CdnUrlOptions, 'size' | 'mediaBase'>,
): string {
  const ext = animated ? 'gif' : 'png';
  const size = appendSize(options, 'sticker');
  return `${mediaBase(options)}/stickers/${stickerId}.${ext}${size}`;
}
