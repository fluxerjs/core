import type { APIMessageAttachment } from '@fluxerjs/types';

/** CamelCase attachment on a {@link Message}. */
export interface MessageAttachment {
  id: string;
  filename: string;
  title: string | null;
  description: string | null;
  contentType: string | null;
  contentHash: string | null;
  size: number;
  url: string | null;
  proxyUrl: string | null;
  width: number | null;
  height: number | null;
  placeholder: string | null;
  flags: number;
  nsfw: boolean;
  duration: number | null;
  waveform: string | null;
  expiresAt: Date | null;
  expired: boolean;
}

/** Map a wire attachment to camelCase. */
export function toMessageAttachment(data: APIMessageAttachment): MessageAttachment {
  return {
    id: data.id,
    filename: data.filename,
    title: data.title ?? null,
    description: data.description ?? null,
    contentType: data.content_type ?? null,
    contentHash: data.content_hash ?? null,
    size: data.size,
    url: data.url ?? null,
    proxyUrl: data.proxy_url ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    placeholder: data.placeholder ?? null,
    flags: data.flags ?? 0,
    nsfw: data.nsfw ?? false,
    duration: data.duration ?? null,
    waveform: data.waveform ?? null,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    expired: data.expired ?? false,
  };
}
