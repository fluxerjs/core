export interface APIEmbedAuthor {
  name?: string;
  url?: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface APIEmbedFooter {
  text: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface APIEmbedMedia {
  url: string;
  proxy_url?: string | null;
  content_type?: string | null;
  content_hash?: string | null;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  /** Base64 placeholder for lazy loading */
  placeholder?: string | null;
  duration?: number | null;
  /** EmbedMediaFlags bitfield (e.g. CONTAINS_EXPLICIT_MEDIA) */
  flags?: number | null;
}

export interface APIEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export type EmbedType = 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link';

/** Nested embed from unfurlers (subset of APIEmbed) */
export interface APIEmbedChild {
  type?: EmbedType;
  url?: string | null;
  title?: string | null;
  color?: number | null;
  timestamp?: string | null;
  description?: string | null;
  author?: APIEmbedAuthor | null;
  image?: APIEmbedMedia | null;
  thumbnail?: APIEmbedMedia | null;
  footer?: APIEmbedFooter | null;
  fields?: APIEmbedField[] | null;
  provider?: APIEmbedAuthor | null;
  video?: APIEmbedMedia | null;
  audio?: APIEmbedMedia | null;
  nsfw?: boolean | null;
}

export interface APIEmbed {
  type?: EmbedType;
  url?: string | null;
  title?: string | null;
  color?: number | null;
  timestamp?: string | null;
  description?: string | null;
  author?: APIEmbedAuthor | null;
  image?: APIEmbedMedia | null;
  thumbnail?: APIEmbedMedia | null;
  footer?: APIEmbedFooter | null;
  fields?: APIEmbedField[] | null;
  provider?: APIEmbedAuthor | null;
  video?: APIEmbedMedia | null;
  audio?: APIEmbedMedia | null;
  nsfw?: boolean | null;
  /** Nested embeds from unfurlers */
  children?: APIEmbedChild[] | null;
}
