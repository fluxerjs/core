import {
  DEFAULT_RESUME_TTL_MS,
  type ISessionStore,
  isSessionInfoFresh,
  type SessionInfo,
} from '@fluxerjs/ws';
import type { RedisClientType } from 'redis';

export interface RedisSessionStoreOptions {
  redis: RedisClientType;
  /** Key prefix. @default 'fluxer:session' */
  prefix?: string;
  /** Resume TTL ms (Fluxer gateway is 60s). @default 60_000 */
  ttlMs?: number;
}

/**
 * Redis-backed {@link ISessionStore} so a replacement host can RESUME within the window.
 */
export class RedisSessionStore implements ISessionStore {
  private readonly redis: RedisClientType;
  private readonly prefix: string;
  private readonly ttlMs: number;

  constructor(options: RedisSessionStoreOptions) {
    this.redis = options.redis;
    this.prefix = options.prefix ?? 'fluxer:session';
    this.ttlMs = options.ttlMs ?? DEFAULT_RESUME_TTL_MS;
  }

  async retrieveSessionInfo(shardId: number): Promise<SessionInfo | null> {
    const raw = await this.redis.get(`${this.prefix}:${shardId}`);
    if (!raw) return null;
    try {
      const info = JSON.parse(raw) as SessionInfo;
      if (!isSessionInfoFresh(info, this.ttlMs)) {
        await this.redis.del(`${this.prefix}:${shardId}`);
        return null;
      }
      return info;
    } catch {
      return null;
    }
  }

  async updateSessionInfo(shardId: number, info: SessionInfo | null): Promise<void> {
    const key = `${this.prefix}:${shardId}`;
    if (info === null) {
      await this.redis.del(key);
      return;
    }
    const payload: SessionInfo = {
      ...info,
      updatedAt: info.updatedAt || Date.now(),
    };
    await this.redis.set(key, JSON.stringify(payload), { PX: this.ttlMs });
  }
}
