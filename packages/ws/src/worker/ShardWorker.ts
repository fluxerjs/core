/**
 * Worker-thread entry for {@link WorkerShardingStrategy}.
 * Owns WebSocketShard sockets; posts events back to the parent.
 */
import { parentPort, workerData } from 'node:worker_threads';
import type { GatewaySendPayload } from '@fluxerjs/types';
import type { SessionInfo } from '../SessionStore.js';
import { MemorySessionStore } from '../SessionStore.js';
import type { ShardStatus } from '../Strategies/IShardingStrategy.js';
import { WebSocketShard } from '../WebSocketShard.js';

interface WorkerData {
  token: string;
  url: string;
  numShards: number;
  version: string;
  intents: number;
  flags?: number;
  ignoredEvents?: string[];
  initialGuildId?: string;
  presence?: unknown;
  debug: boolean;
  shardIds: number[];
  hasSessionStore: boolean;
}

type ParentMessage =
  | { op: 'connect'; shardId: number }
  | { op: 'send'; shardId: number; payload: GatewaySendPayload }
  | { op: 'destroy'; code?: number }
  | { op: 'fetchStatus' }
  | { op: 'sessionResult'; requestId: number; info: SessionInfo | null };

if (!parentPort) {
  throw new Error('ShardWorker must be run as a worker thread');
}

const data = workerData as WorkerData;
const shards = new Map<number, WebSocketShard>();
const pendingSession = new Map<
  number,
  { resolve: (v: SessionInfo | null) => void; reject: (e: Error) => void }
>();
let nextRequestId = 1;

const proxyStore = data.hasSessionStore
  ? {
      retrieveSessionInfo(shardId: number): Promise<SessionInfo | null> {
        const requestId = nextRequestId++;
        return new Promise((resolve, reject) => {
          pendingSession.set(requestId, { resolve, reject });
          parentPort?.postMessage({ op: 'retrieveSession', shardId, requestId });
        });
      },
      updateSessionInfo(shardId: number, info: SessionInfo | null): Promise<void> {
        const requestId = nextRequestId++;
        return new Promise((resolve, reject) => {
          pendingSession.set(requestId, {
            resolve: () => resolve(),
            reject,
          });
          parentPort?.postMessage({ op: 'updateSession', shardId, info, requestId });
        });
      },
    }
  : new MemorySessionStore();

for (const id of data.shardIds) {
  const shard = new WebSocketShard({
    url: data.url,
    token: data.token,
    intents: data.intents,
    flags: data.flags,
    ignoredEvents: data.ignoredEvents,
    initialGuildId: data.initialGuildId,
    presence: data.presence as never,
    shardId: id,
    numShards: data.numShards,
    version: data.version,
    debug: data.debug,
    sessionStore: proxyStore,
  });

  shard.on('ready', (payload) =>
    parentPort?.postMessage({ op: 'ready', shardId: id, data: payload }),
  );
  shard.on('resumed', () => parentPort?.postMessage({ op: 'resumed', shardId: id }));
  shard.on('dispatch', (payload) =>
    parentPort?.postMessage({ op: 'dispatch', shardId: id, payload }),
  );
  shard.on('close', (code) => parentPort?.postMessage({ op: 'close', shardId: id, code }));
  shard.on('error', (err) =>
    parentPort?.postMessage({
      op: 'error',
      shardId: id,
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  shard.on('debug', (message) => parentPort?.postMessage({ op: 'debug', message }));
  shard.on('shardingRequired', ({ shardId, numShards }) =>
    parentPort?.postMessage({ op: 'shardingRequired', shardId, numShards }),
  );
  shard.on('ping', (ping: number) => parentPort?.postMessage({ op: 'ping', shardId: id, ping }));

  shards.set(id, shard);
}

parentPort.on('message', (msg: ParentMessage) => {
  switch (msg.op) {
    case 'connect':
      shards.get(msg.shardId)?.connect();
      break;
    case 'send':
      shards.get(msg.shardId)?.send(msg.payload);
      break;
    case 'destroy':
      for (const shard of shards.values()) shard.destroy();
      shards.clear();
      break;
    case 'fetchStatus': {
      const statuses: Array<[number, ShardStatus]> = [];
      for (const [id, shard] of shards) {
        const s = shard.status;
        statuses.push([
          id,
          s === 0
            ? 'idle'
            : s === 1
              ? 'connecting'
              : s === 2
                ? 'open'
                : s === 3
                  ? 'closing'
                  : 'idle',
        ]);
      }
      parentPort?.postMessage({ op: 'status', statuses });
      break;
    }
    case 'sessionResult': {
      const pending = pendingSession.get(msg.requestId);
      if (pending) {
        pendingSession.delete(msg.requestId);
        pending.resolve(msg.info);
      }
      break;
    }
    default:
      break;
  }
});

parentPort.postMessage({ op: 'workerReady' });
