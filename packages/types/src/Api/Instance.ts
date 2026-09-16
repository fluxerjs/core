/**
 * Response from `GET /.well-known/fluxer` (unauthenticated instance discovery).
 * Aligns with OpenAPI `WellKnownFluxerResponse`.
 */

/** Endpoint URLs for a Fluxer instance. */
export interface APIInstanceEndpoints {
  /**
   * First-party authenticated API (same configured endpoint as {@link api_client}).
   * Third-party clients MUST use {@link api_public} for REST, not this field.
   */
  api: string;
  /** First-party client API. Same configured endpoint as {@link api}. */
  api_client: string;
  /** Public API for bots, libraries, and other third-party clients. */
  api_public: string;
  /** WebSocket URL for the gateway. */
  gateway: string;
  /** Base URL for the media proxy (avatars, icons, emojis, etc.). */
  media: string;
  /** Base URL for static assets (default avatars). */
  static_cdn: string;
  /** Base URL for the marketing website. */
  marketing: string;
  /** Base URL for the admin panel. */
  admin: string;
  /** Base URL for invite links. */
  invite: string;
  /** Base URL for gift links. */
  gift: string;
  /** Base URL for the web application. */
  webapp: string;
}

/** Captcha configuration from instance discovery. */
export interface APIInstanceCaptcha {
  provider: string;
  hcaptcha_site_key: string | null;
  turnstile_site_key: string | null;
}

/** Feature flags from instance discovery. */
export interface APIInstanceFeatures {
  voice_enabled: boolean;
  stripe_enabled: boolean;
  self_hosted: boolean;
  presigned_attachment_uploads: boolean;
  emails_enabled: boolean;
}

/** GIF provider configuration. */
export interface APIInstanceGif {
  provider: string;
  display_name: string;
  attribution_required: boolean;
}

/** SSO configuration. */
export interface APIInstanceSso {
  enabled: boolean;
  enforced: boolean;
  display_name: string | null;
  redirect_uri: string;
}

/** Registration policy. */
export interface APIInstanceRegistration {
  mode: 'open' | 'approval' | 'closed';
  admin_registration_urls_enabled: boolean;
}

/** Community topology. */
export interface APIInstanceCommunity {
  single_community: boolean;
  single_community_guild_id: string | null;
  direct_messages_disabled: boolean;
}

/** Optional third-party service toggles. */
export interface APIInstanceServices {
  gif_enabled: boolean;
  youtube_enabled: boolean;
  bluesky_enabled: boolean;
}

/** Limit rule from instance discovery. */
export interface APIInstanceLimitRule {
  id: string;
  filters?: {
    traits?: string[];
    guildFeatures?: string[];
  };
  overrides: Record<string, number>;
}

/** Limit configuration. */
export interface APIInstanceLimits {
  version: 2;
  traitDefinitions: string[];
  rules: APIInstanceLimitRule[];
  defaultsHash: string;
}

/** Push notification configuration. */
export interface APIInstancePush {
  public_vapid_key: string | null;
}

/** Public branding / legal / setup metadata. */
export interface APIInstanceAppPublic {
  branding?: {
    product_name?: string;
    icon_url?: string | null;
    symbol_url?: string | null;
    logo_url?: string | null;
    wordmark_url?: string | null;
    favicon_url?: string | null;
    theme_color?: string | null;
  };
  setup?: {
    configured?: boolean;
    admin_url?: string | null;
  };
  legal?: {
    terms_url?: string | null;
    privacy_url?: string | null;
  };
  registration?: {
    collect_date_of_birth?: boolean;
  };
}

/**
 * Full instance discovery document (`WellKnownFluxerResponse`).
 * Prefer {@link APIInstanceEndpoints} when only URLs are needed.
 */
/**
 * Full instance discovery document (`WellKnownFluxerResponse`).
 * Nested sections are required on the wire; discovery helpers may fill defaults when absent.
 */
export interface APIInstance {
  api_code_version: number;
  endpoints: APIInstanceEndpoints;
  captcha: APIInstanceCaptcha;
  features: APIInstanceFeatures;
  gif: APIInstanceGif;
  sso: APIInstanceSso;
  registration: APIInstanceRegistration;
  community: APIInstanceCommunity;
  services: APIInstanceServices;
  limits: APIInstanceLimits;
  push: APIInstancePush;
  app_public: APIInstanceAppPublic;
}

/** @deprecated Use {@link APIInstance} — alias kept for clarity with OpenAPI naming. */
export type APIWellKnownFluxer = APIInstance;
