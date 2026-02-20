import { REST } from '@fluxerjs/rest';
import { GatewayPresenceUpdateData } from '@fluxerjs/types';

/** Optional cache size limits. When exceeded, oldest entries are evicted (FIFO). Omit or use 0 for unbounded. */
export interface CacheSizeLimits {
  channels?: number;
  guilds?: number;
  users?: number;
}

export interface ClientOptions {
  rest?: Partial<ConstructorParameters<typeof REST>[0]>;
  /** Gateway intents. Not yet supported by Fluxer—value is always sent as 0. Set suppressIntentWarning to silence the warning. */
  intents?: number;
  /** Suppress the warning when intents are set (Fluxer does not support intents yet). */
  suppressIntentWarning?: boolean;
  /** Cache size limits (channels, guilds, users). When exceeded, oldest entries are evicted. Omit or 0 = unbounded. */
  cache?: CacheSizeLimits;
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
