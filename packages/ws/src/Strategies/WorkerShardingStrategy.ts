import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { GatewaySendPayload } from '@fluxerjs/types';
import type { SessionInfo } from '../SessionStore.js';
import type { WebSocketManager } from '../WebSocketManager.js';
import { averageShardPings } from '../WebSocketShard.js';
import type { IShardingStrategy, ShardStatus } from './IShardingStrategy.js';

export interface WorkerShardingStrategyOptions {
  /** How many shards each worker owns. @default 1 */
  shardsPerWorker?: number | 'all';
}

interface WorkerHandle {
  worker: Worker;
  shardIds: number[];
  ready: Promise<void>;
  resolveReady: () => void;
  rejectReady: (err: Error) => void;
}

type WorkerInbound =
  | { op: 'ready'; shardId: number; data: unknown }
  | { op: 'resumed'; shardId: number }
  | { op: 'dispatch'; shardId: number; payload: unknown }
  | { op: 'close'; shardId: number; code: number }
  | { op: 'error'; shardId: number; message: string }
  | { op: 'debug'; message: string }
  | { op: 'shardingRequired'; shardId: number; numShards: number }
  | { op: 'status'; statuses: Array<[number, ShardStatus]> }
  | { op: 'ping'; shardId: number; ping: number }
  | { op: 'workerReady' }
  | { op: 'retrieveSession'; shardId: number; requestId: number }
  | { op: 'updateSession'; shardId: number; info: SessionInfo | null; requestId: number };

/**
 * Runs gateway shards in `worker_threads`.
 * Workers own sockets/heartbeats/JSON.parse; dispatches are posted back to the main thread.
 *
 * Note: the client cache still lives on the main thread — this does not solve the memory wall.
 * Use process-level sharding (`@fluxerjs/sharding`) for that.
 *
 * @example
 * ```ts
 * new WebSocketManager({
 *   // ...
 *   buildStrategy: (manager) => new WorkerShardingStrategy(manager, { shardsPerWorker: 2 }),
 * });
 * ```
 */
export class WorkerShardingStrategy implements IShardingStrategy {
  private readonly manager: WebSocketManager;
  private readonly shardsPerWorker: number | 'all';
  private readonly workers: WorkerHandle[] = [];
  private readonly statuses = new Map<number, ShardStatus>();
  private readonly pings = new Map<number, number>();
  private statusWaiters: Array<{
    resolve: (v: Map<number, ShardStatus>) => void;
    reject: (e: Error) => void;
  }> = [];

  constructor(manager: WebSocketManager, options: WorkerShardingStrategyOptions = {}) {
    this.manager = manager;
    this.shardsPerWorker = options.shardsPerWorker ?? 1;
  }

  async spawn(shardIds: number[]): Promise<void> {
    for (const id of shardIds) this.statuses.set(id, 'idle');

    const groups = this.groupShards(shardIds);
    const workerUrl = resolveWorkerEntry();
    const opts = this.manager.getOptions();
    const url = this.manager.getGatewayUrl();
    if (!url) {
      throw new Error('WorkerShardingStrategy.spawn called before gateway URL was resolved');
    }

    for (const group of groups) {
      let resolveReady!: () => void;
      let rejectReady!: (err: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });

      const worker = new Worker(workerUrl, {
        workerData: {
          token: opts.token,
          url,
          numShards: this.manager.getShardCount(),
          version: opts.version ?? '1',
          intents: opts.intents ?? 0,
          flags: opts.flags,
          ignoredEvents: opts.ignoredEvents,
          initialGuildId: opts.initialGuildId,
          presence: opts.presence,
          debug: opts.debug !== false,
          shardIds: group,
          hasSessionStore: true,
        },
      });

      const handle: WorkerHandle = { worker, shardIds: group, ready, resolveReady, rejectReady };
      worker.on('message', (msg: WorkerInbound) => this.onWorkerMessage(handle, msg));
      worker.on('error', (err) => {
        for (const id of group) this.manager.emit('error', { shardId: id, error: err });
        rejectReady(err);
      });
      worker.on('exit', (code) => {
        if (code !== 0) {
          const err = new Error(`Shard worker exited with code ${code}`);
          for (const id of group) this.manager.emit('error', { shardId: id, error: err });
        }
      });
      this.workers.push(handle);
    }

    await Promise.all(this.workers.map((w) => w.ready));
  }

  async connect(): Promise<void> {
    const throttler = this.manager.getIdentifyThrottler();
    for (const handle of this.workers) {
      for (const shardId of handle.shardIds) {
        await throttler.waitForIdentify(shardId, async () => {
          handle.worker.postMessage({ op: 'connect', shardId });
        });
      }
    }
  }

  async destroy(options?: { code?: number }): Promise<void> {
    await Promise.all(
      this.workers.map(
        (handle) =>
          new Promise<void>((resolve) => {
            handle.worker.postMessage({ op: 'destroy', code: options?.code });
            handle.worker
              .terminate()
              .then(() => resolve())
              .catch(() => resolve());
          }),
      ),
    );
    this.workers.length = 0;
    this.statuses.clear();
    this.pings.clear();
  }

  getPing(): number {
    return averageShardPings(this.pings.values());
  }

  async send(shardId: number, payload: GatewaySendPayload): Promise<void> {
    const handle = this.workers.find((w) => w.shardIds.includes(shardId));
    handle?.worker.postMessage({ op: 'send', shardId, payload });
  }

  async fetchStatus(): Promise<Map<number, ShardStatus>> {
    if (this.workers.length === 0) return new Map(this.statuses);
    return new Promise<Map<number, ShardStatus>>((resolve, reject) => {
      this.statusWaiters.push({ resolve, reject });
      for (const handle of this.workers) {
        handle.worker.postMessage({ op: 'fetchStatus' });
      }
    });
  }

  private groupShards(shardIds: number[]): number[][] {
    if (this.shardsPerWorker === 'all') return [shardIds];
    const size = Math.max(1, this.shardsPerWorker);
    const groups: number[][] = [];
    for (let i = 0; i < shardIds.length; i += size) {
      groups.push(shardIds.slice(i, i + size));
    }
    return groups;
  }

  private onWorkerMessage(handle: WorkerHandle, msg: WorkerInbound): void {
    switch (msg.op) {
      case 'workerReady':
        handle.resolveReady();
        break;
      case 'ready':
        this.statuses.set(msg.shardId, 'open');
        this.manager.emit('ready', { shardId: msg.shardId, data: msg.data });
        break;
      case 'resumed':
        this.statuses.set(msg.shardId, 'open');
        this.manager.emit('resumed', msg.shardId);
        break;
      case 'dispatch':
        this.manager.emit('dispatch', { shardId: msg.shardId, payload: msg.payload });
        break;
      case 'close':
        this.statuses.set(msg.shardId, 'idle');
        this.manager.emit('close', { shardId: msg.shardId, code: msg.code });
        break;
      case 'error':
        this.manager.emit('error', {
          shardId: msg.shardId,
          error: new Error(msg.message),
        });
        break;
      case 'debug':
        this.manager.emit('debug', msg.message);
        break;
      case 'shardingRequired':
        this.manager.emit('shardingRequired', {
          shardId: msg.shardId,
          numShards: msg.numShards,
        });
        break;
      case 'ping':
        this.pings.set(msg.shardId, msg.ping);
        break;
      case 'status':
        for (const [id, status] of msg.statuses) this.statuses.set(id, status);
        if (this.statusWaiters.length > 0) {
          const waiters = this.statusWaiters.splice(0);
          const snapshot = new Map(this.statuses);
          for (const w of waiters) w.resolve(snapshot);
        }
        break;
      case 'retrieveSession':
        void this.handleRetrieveSession(handle, msg.shardId, msg.requestId);
        break;
      case 'updateSession':
        void this.handleUpdateSession(handle, msg.shardId, msg.info, msg.requestId);
        break;
      default:
        break;
    }
  }

  private async handleRetrieveSession(
    handle: WorkerHandle,
    shardId: number,
    requestId: number,
  ): Promise<void> {
    let info: SessionInfo | null = null;
    try {
      info = (await this.manager.getSessionStore().retrieveSessionInfo(shardId)) ?? null;
    } catch (err) {
      this.manager.emit('error', {
        shardId,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
    handle.worker.postMessage({ op: 'sessionResult', requestId, info });
  }

  private async handleUpdateSession(
    handle: WorkerHandle,
    shardId: number,
    info: SessionInfo | null,
    requestId: number,
  ): Promise<void> {
    try {
      await this.manager.getSessionStore().updateSessionInfo(shardId, info);
    } catch (err) {
      this.manager.emit('error', {
        shardId,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
    handle.worker.postMessage({ op: 'sessionResult', requestId, info: null });
  }
}

/**
 * Resolve the compiled worker entry without `import.meta` (keeps CJS DTS valid).
 */
function resolveWorkerEntry(): string {
  const require = createRequire(join(process.cwd(), 'package.json'));
  const mainEntry = require.resolve('@fluxerjs/ws');
  const distDir = dirname(mainEntry);
  const candidates = [
    join(distDir, 'worker', 'ShardWorker.js'),
    join(distDir, 'ShardWorker.js'),
    // Legacy filenames from earlier builds
    join(distDir, 'worker', 'shardWorker.js'),
    join(distDir, 'shardWorker.js'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0] as string;
}
