import type {
  APIEmbed,
  APIEmbedAuthor,
  APIEmbedChild,
  APIEmbedFooter,
  APIEmbedMedia,
  EmbedType,
} from '@fluxerjs/types';

/** CamelCase author / provider block on a {@link MessageEmbed}. */
export interface MessageEmbedAuthor {
  name: string | null;
  url: string | null;
  iconUrl: string | null;
  proxyIconUrl: string | null;
}

/** CamelCase footer on a {@link MessageEmbed}. */
export interface MessageEmbedFooter {
  text: string;
  iconUrl: string | null;
  proxyIconUrl: string | null;
}

/** CamelCase image / thumbnail / video / audio on a {@link MessageEmbed}. */
export interface MessageEmbedMedia {
  url: string;
  proxyUrl: string | null;
  contentType: string | null;
  contentHash: string | null;
  width: number | null;
  height: number | null;
  description: string | null;
  placeholder: string | null;
  duration: number | null;
  flags: number | null;
}

/** Named field row on a {@link MessageEmbed}. */
export interface MessageEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

/** CamelCase embed on a received {@link Message}. Send via EmbedBuilder.toJSON() (wire). */
export interface MessageEmbed {
  type: EmbedType;
  url: string | null;
  title: string | null;
  color: number | null;
  timestamp: Date | null;
  description: string | null;
  author: MessageEmbedAuthor | null;
  image: MessageEmbedMedia | null;
  thumbnail: MessageEmbedMedia | null;
  footer: MessageEmbedFooter | null;
  fields: MessageEmbedField[];
  provider: MessageEmbedAuthor | null;
  video: MessageEmbedMedia | null;
  audio: MessageEmbedMedia | null;
  nsfw: boolean;
  children: MessageEmbed[];
  html: string | null;
  htmlWidth: number | null;
  htmlHeight: number | null;
}

function toMessageEmbedAuthor(data: APIEmbedAuthor): MessageEmbedAuthor {
  return {
    name: data.name ?? null,
    url: data.url ?? null,
    iconUrl: data.icon_url ?? null,
    proxyIconUrl: data.proxy_icon_url ?? null,
  };
}

function toMessageEmbedFooter(data: APIEmbedFooter): MessageEmbedFooter {
  return {
    text: data.text,
    iconUrl: data.icon_url ?? null,
    proxyIconUrl: data.proxy_icon_url ?? null,
  };
}

function toMessageEmbedMedia(data: APIEmbedMedia): MessageEmbedMedia {
  return {
    url: data.url,
    proxyUrl: data.proxy_url ?? null,
    contentType: data.content_type ?? null,
    contentHash: data.content_hash ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    description: data.description ?? null,
    placeholder: data.placeholder ?? null,
    duration: data.duration ?? null,
    flags: data.flags ?? null,
  };
}

/** Map a wire embed (or nested child) to camelCase. */
export function toMessageEmbed(data: APIEmbed | APIEmbedChild): MessageEmbed {
  const full = data as APIEmbed;
  return {
    type: data.type ?? 'rich',
    url: data.url ?? null,
    title: data.title ?? null,
    color: data.color ?? null,
    timestamp: data.timestamp ? new Date(data.timestamp) : null,
    description: data.description ?? null,
    author: data.author ? toMessageEmbedAuthor(data.author) : null,
    image: data.image ? toMessageEmbedMedia(data.image) : null,
    thumbnail: data.thumbnail ? toMessageEmbedMedia(data.thumbnail) : null,
    footer: data.footer ? toMessageEmbedFooter(data.footer) : null,
    fields: (data.fields ?? []).map((f) => ({
      name: f.name,
      value: f.value,
      inline: f.inline ?? false,
    })),
    provider: data.provider ? toMessageEmbedAuthor(data.provider) : null,
    video: data.video ? toMessageEmbedMedia(data.video) : null,
    audio: data.audio ? toMessageEmbedMedia(data.audio) : null,
    nsfw: data.nsfw ?? false,
    children: (full.children ?? []).map(toMessageEmbed),
    html: full.html ?? null,
    htmlWidth: full.html_width ?? null,
    htmlHeight: full.html_height ?? null,
  };
}
