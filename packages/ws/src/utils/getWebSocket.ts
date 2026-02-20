/**
 * Returns the WebSocket implementation to use.
 * Uses global WebSocket (browser, Node 22+, Deno, Bun) when available;
 * otherwise uses the bundled `ws` package (Node 18/20).
 * Users never need to install ws themselves.
 */

import ws from 'ws';

type WSConstructor = new (url: string) => {
  send(data: string | ArrayBufferLike): void;
  close(code?: number): void;
  readyState: number;
  addEventListener?(type: string, listener: (e: unknown) => void): void;
  on?(event: string, cb: (data?: unknown) => void): void;
};

let cached: WSConstructor | null = null;

export function getDefaultWebSocketSync(): WSConstructor {
  if (cached) return cached;
  if (typeof globalThis.WebSocket !== 'undefined') {
    cached = globalThis.WebSocket as unknown as WSConstructor;
    return cached;
  }
  if (typeof require === 'function') {
    try {
      cached = require('ws') as WSConstructor;
      return cached;
    } catch {
      // fall through
    }
  }
  throw new Error(
    'No WebSocket implementation. Use Node 22+, or run with CommonJS. The "ws" package is bundled with @fluxerjs/ws.',
  );
}

/** Async version for ESM where we need dynamic import('ws'). */
export async function getDefaultWebSocket(): Promise<WSConstructor> {
  if (cached) return cached;
  if (typeof globalThis.WebSocket !== 'undefined') {
    cached = globalThis.WebSocket as unknown as WSConstructor;
    return cached;
  }
  if (typeof require === 'function') {
    try {
      cached = require('ws') as WSConstructor;
      return cached;
    } catch {
      // continue
    }
  }
  return ws;
}
