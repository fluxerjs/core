import type { REST } from '@fluxerjs/rest';
import type { GatewayPresenceUpdateData } from '@fluxerjs/types';

export interface ClientOptions {
  /** CDN base URL for avatars, icons, emojis, etc. When omitted, defaults to fluxerusercontent.com. Set from {@link WellKnownFluxerResponse.endpoints.static_cdn} when using self-hosted instances. */
  cdn?: string;
  rest?: Partial<ConstructorParameters<typeof REST>[0]>;
  intents?: number;
  /** Initial presence (status, custom_status, etc.) sent on identify. Can also update via PresenceUpdate after connect. */
  presence?: GatewayPresenceUpdateData;
  /** Optional WebSocket constructor (e.g. `require('ws')` in Node for compatibility) */
  WebSocket?: new (url: string) => {
    send(data: string | ArrayBufferLike): void;
    close(code?: number): void;
    readyState: number;
    addEventListener?(type: string, listener: (e: unknown) => void): void;
    on?(event: string, cb: (data?: unknown) => void): void;
  };
}
