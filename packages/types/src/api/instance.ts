/**
 * Instance discovery types from GET /.well-known/fluxer (unauthenticated).
 * Replaces the legacy /instance endpoint.
 */

/** Endpoint URLs for various services. */
export interface WellKnownFluxerResponseEndpoints {
  api: string;
  api_client: string;
  api_public: string;
  gateway: string;
  media: string;
  static_cdn: string;
  marketing: string;
  admin: string;
  invite: string;
  gift: string;
  webapp: string;
}

/** Captcha configuration. */
export interface WellKnownFluxerResponseCaptcha {
  provider: string;
  hcaptcha_site_key: string | null;
  turnstile_site_key: string | null;
}

/** Feature flags for this instance. */
export interface WellKnownFluxerResponseFeatures {
  sms_mfa_enabled: boolean;
  voice_enabled: boolean;
  stripe_enabled: boolean;
  self_hosted: boolean;
  manual_review_enabled: boolean;
}

/** GIF provider configuration. */
export interface WellKnownFluxerResponseGif {
  provider: 'klipy' | 'tenor';
}

/** Push notification configuration. */
export interface WellKnownFluxerResponsePush {
  public_vapid_key: string | null;
}

/** Limit rule response (simplified for SDK use). */
export interface LimitRuleResponse {
  [key: string]: unknown;
}

/** Limit configuration. */
export interface WellKnownFluxerResponseLimits {
  version: number;
  traitDefinitions: string[];
  rules: LimitRuleResponse[];
  defaultsHash: string;
}

/** Public application configuration for client-side features. */
export interface WellKnownFluxerResponseAppPublic {
  sentry_dsn?: string;
  sentry_project_id?: string;
  sentry_proxy_path?: string;
  sentry_public_key?: string;
  sentry_report_host?: string;
}

/** SSO status response. */
export interface SsoStatusResponse {
  enabled: boolean;
  enforced: boolean;
  display_name: string | null;
  redirect_uri: string;
}

/** Federation configuration (optional). */
export interface WellKnownFluxerResponseFederation {
  enabled: boolean;
  version: number;
}

/** OAuth2 endpoints for federation (optional). */
export interface WellKnownFluxerResponseOauth2 {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  scopes_supported: string[];
}

/** Public key for E2E encryption (optional). */
export interface WellKnownFluxerResponsePublicKey {
  id: string;
  algorithm: 'x25519';
  public_key_base64: string;
}

/**
 * Response from GET /.well-known/fluxer (instance discovery).
 * Canonical discovery endpoint for all Fluxer clients. Includes API endpoints,
 * feature flags, limits, and federation capabilities.
 *
 * @example
 * const info = await client.fetchInstance();
 * console.log(info.endpoints.gateway); // WebSocket URL
 * console.log(info.endpoints.media);   // Media proxy URL for avatars, etc.
 */
export interface WellKnownFluxerResponse {
  api_code_version: number;
  app_public?: WellKnownFluxerResponseAppPublic;
  captcha: WellKnownFluxerResponseCaptcha;
  endpoints: WellKnownFluxerResponseEndpoints;
  features: WellKnownFluxerResponseFeatures;
  federation?: WellKnownFluxerResponseFederation;
  gif: WellKnownFluxerResponseGif;
  limits?: WellKnownFluxerResponseLimits;
  oauth2?: WellKnownFluxerResponseOauth2;
  public_key?: WellKnownFluxerResponsePublicKey;
  push: WellKnownFluxerResponsePush;
  sso?: SsoStatusResponse;
}

/**
 * @deprecated Use WellKnownFluxerResponse from GET /.well-known/fluxer instead.
 * Legacy response from GET /v1/instance. Kept for type compatibility during migration.
 */
export interface APIInstance {
  api_code_version: string;
  endpoints: {
    api: string;
    gateway: string;
  };
  captcha?: Record<string, unknown>;
  features?: {
    voice_enabled?: boolean;
  };
  push?: Record<string, unknown>;
}
