import { EventEmitter } from 'events';
import type { APIGatewayBotResponse } from '@fluxerjs/types';
import { WebSocketShard } from './WebSocketShard.js';
import { getDefaultWebSocket } from './utils/getWebSocket.js';

export type WebSocketConstructor = import('./WebSocketShard.js').WebSocketConstructor;

export interface WebSocketManagerOptions {
  token: string;
  intents: number;
  rest: { get: (route: string) => Promise<unknown> };
  version?: string;
  shardIds?: number[];
  shardCount?: number;
  WebSocket?: WebSocketConstructor;
}

export class WebSocketManager extends EventEmitter {
  private readonly options: WebSocketManagerOptions;
  private shards = new Map<number, WebSocketShard>();
  private gatewayUrl: string | null = null;
  private shardCount = 1;

  constructor(options: WebSocketManagerOptions) {
    super();
    this.options = options;
  }

  async connect(): Promise<void> {
    let WS = this.options.WebSocket;
    if (!WS) {
      try {
        WS = await getDefaultWebSocket();
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        this.emit('error', { shardId: -1, error: e });
        throw e;
      }
    }

    try {
      const gateway = await this.options.rest.get('/gateway/bot') as APIGatewayBotResponse;
      this.gatewayUrl = gateway.url;
      this.shardCount = this.options.shardCount ?? gateway.shards;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      this.emit('error', { shardId: -1, error: e });
      throw e;
    }

    const ids = this.options.shardIds ?? [...Array(this.shardCount).keys()];

    const version = this.options.version ?? '1';

    for (const id of ids) {
      const shard = new WebSocketShard({
        url: this.gatewayUrl!,
        token: this.options.token,
        intents: this.options.intents,
        shardId: id,
        numShards: this.shardCount,
        version,
        WebSocket: WS,
      });

      shard.on('ready', (data) => this.emit('ready', { shardId: id, data }));
      shard.on('resumed', () => this.emit('resumed', id));
      shard.on('dispatch', (payload) => this.emit('dispatch', { shardId: id, payload }));
      shard.on('close', (code) => this.emit('close', { shardId: id, code }));
      shard.on('error', (err) => this.emit('error', { shardId: id, error: err }));
      shard.on('debug', (msg) => this.emit('debug', msg));

      this.shards.set(id, shard);
      shard.connect();
    }
  }

  send(shardId: number, payload: Parameters<WebSocketShard['send']>[0]): void {
    this.shards.get(shardId)?.send(payload);
  }

  destroy(): void {
    for (const shard of this.shards.values()) shard.destroy();
    this.shards.clear();
    this.gatewayUrl = null;
  }

  getShardCount(): number {
    return this.shardCount;
  }
}
