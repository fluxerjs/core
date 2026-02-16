import { EmbedMediaFlags } from '@fluxerjs/types';

/** Result for embed media: url and optional flags. */
export interface TenorMediaResult {
  url: string;
  flags?: number;
}

/**
 * Resolve a Tenor view URL to a direct GIF URL for use in embeds.
 * Embeds require GIF format (not MP4). Fetches the Tenor page for JSON-LD
 * or oEmbed, then derives the GIF URL from the media.tenor.com path.
 *
 * @param tenorViewUrl - Tenor view URL (e.g. https://tenor.com/view/stressed-gif-7048057395502071840)
 * @returns { url, flags? } for setImage/setThumbnail, or null if resolution fails
 * @example
 * const media = await resolveTenorToImageUrl('https://tenor.com/view/stressed-gif-7048057395502071840');
 * if (media) embed.setImage(media);
 */
export async function resolveTenorToImageUrl(
  tenorViewUrl: string,
): Promise<TenorMediaResult | null> {
  if (!tenorViewUrl || !tenorViewUrl.includes('tenor.com')) return null;

  // Try page HTML + JSON-LD first
  try {
    const pageRes = await fetch(tenorViewUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FluxerSDK/1.0)' },
    });
    if (!pageRes.ok) throw new Error('Page fetch failed');
    const html = await pageRes.text();
    const jsonLd = extractTenorJsonLd(html);
    const gifUrl = extractGifUrlFromJsonLd(jsonLd);
    if (gifUrl) {
      return { url: gifUrl, flags: EmbedMediaFlags.IS_ANIMATED };
    }
  } catch {
    // Fall through to oEmbed
  }

  // Fallback: oEmbed thumbnail, derive GIF URL (media.tenor.com/ID/name.png -> name.gif)
  try {
    const oembedUrl = `https://tenor.com/oembed?url=${encodeURIComponent(tenorViewUrl)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    const gifUrl = deriveGifFromThumbnail(data.thumbnail_url);
    return gifUrl ? { url: gifUrl, flags: EmbedMediaFlags.IS_ANIMATED } : null;
  } catch {
    return null;
  }
}

/** Extract GIF URL from JSON-LD. Prefers .gif URLs; derives from thumbnail path if needed. */
function extractGifUrlFromJsonLd(jsonLd: Record<string, unknown> | null): string | null {
  if (!jsonLd) return null;
  const image = jsonLd.image as Record<string, string> | undefined;
  const video = jsonLd.video as Record<string, string> | undefined;
  const thumbnailUrl = image?.thumbnailUrl ?? image?.url;
  const contentUrl = image?.contentUrl ?? video?.contentUrl;
  if (contentUrl && /\.gif($|\?)/i.test(contentUrl)) return contentUrl;
  if (thumbnailUrl) return deriveGifFromThumbnail(thumbnailUrl);
  return null;
}

/** Derive GIF URL from media.tenor.com thumbnail (.png -> .gif). */
function deriveGifFromThumbnail(thumbUrl: string | undefined): string | null {
  if (!thumbUrl || !thumbUrl.includes('media.tenor.com')) return null;
  const gifUrl = thumbUrl.replace(/\.(png|jpg|jpeg|webp)(\?|$)/i, '.gif$2');
  return gifUrl !== thumbUrl ? gifUrl : null;
}

function extractTenorJsonLd(html: string): Record<string, unknown> | null {
  const re =
    /<script[^>]*class="dynamic"[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i;
  const alt =
    /<script[^>]*type="application\/ld\+json"[^>]*class="dynamic"[^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(re) ?? html.match(alt);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
