import type { REST } from '@fluxerjs/rest';

export interface ClientOptions {
  rest?: Partial<ConstructorParameters<typeof REST>[0]>;
  intents?: number;
  /** Optional WebSocket constructor (e.g. `require('ws')` in Node for compatibility) */
  WebSocket?: new (url: string) => {
    send(data: string | ArrayBufferLike): void;
    close(code?: number): void;
    readyState: number;
    addEventListener?(type: string, listener: (e: unknown) => void): void;
    on?(event: string, cb: (data?: unknown) => void): void;
  };
}
