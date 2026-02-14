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
  proxy_url?: string;
  width?: number;
  height?: number;
}

export interface APIEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export type EmbedType = 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link';

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
}
