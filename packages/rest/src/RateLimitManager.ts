/** Per-route rate limit state. Keep-alive fetch never bypasses this. */

export interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number;
}

const MAJOR_PARAMETER_RE = /\/(channels|guilds|webhooks)\/\d{17,19}(?:\/|$)/;
const ORIGIN_RE = /^\S+ (https?:\/\/[^/]+)/;

export class RateLimitManager {
  private readonly buckets = new Map<string, RateLimitState>();
  private readonly routeBuckets = new Map<string, string>();
  private globalResetAt = 0;
  private static readonly MAX_BUCKETS = 2_000;

  private getBucketKey(route: string): string {
    const key = this.routeBuckets.get(route);
    if (key === undefined) return route;
    this.routeBuckets.delete(route);
    this.routeBuckets.set(route, key);
    return key;
  }

  private getBucketEntry(route: string): { key: string; state: RateLimitState } | undefined {
    const key = this.getBucketKey(route);
    const state = this.buckets.get(key);
    if (state === undefined) return undefined;
    this.buckets.delete(key);
    this.buckets.set(key, state);
    return { key, state };
  }

  getBucket(route: string): RateLimitState | undefined {
    return this.getBucketEntry(route)?.state;
  }

  setBucket(route: string, limit: number, remaining: number, resetAt: number): void {
    const key = this.getBucketKey(route);
    if (this.buckets.has(key)) this.buckets.delete(key);
    this.buckets.set(key, { limit, remaining, resetAt });
    this.prune();
  }

  setGlobalReset(resetAt: number): void {
    this.globalResetAt = resetAt;
  }

  getGlobalReset(): number {
    return this.globalResetAt;
  }

  /** Ms to wait before sending again (0 if clear). */
  getWaitTime(route: string): number {
    const now = Date.now();
    if (this.globalResetAt > 0 && this.globalResetAt <= now) this.globalResetAt = 0;
    const globalWait = this.globalResetAt > now ? this.globalResetAt - now : 0;

    const bucket = this.getBucketEntry(route);
    if (bucket && bucket.state.resetAt <= now) {
      this.buckets.delete(bucket.key);
      return globalWait;
    }
    const bucketWait =
      bucket && bucket.state.remaining <= 0 && bucket.state.resetAt > now
        ? bucket.state.resetAt - now
        : 0;
    return Math.max(globalWait, bucketWait);
  }

  /** Apply X-RateLimit-* headers. 429 Retry-After is handled by RequestManager. */
  updateFromHeaders(route: string, headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    const resetAfter = headers.get('X-RateLimit-Reset-After');
    if (limit === null || remaining === null || (reset === null && resetAfter === null)) return;

    const limitN = Number.parseInt(limit, 10);
    const remainingN = Number.parseInt(remaining, 10);
    const resetSec = reset === null ? Number.NaN : Number.parseFloat(reset);
    const resetAfterSec = resetAfter === null ? Number.NaN : Number.parseFloat(resetAfter);
    if (
      !Number.isFinite(limitN) ||
      !Number.isFinite(remainingN) ||
      (!Number.isFinite(resetSec) && !Number.isFinite(resetAfterSec))
    ) {
      return;
    }

    const bucket = headers.get('X-RateLimit-Bucket');
    if (bucket) {
      const major = route.match(MAJOR_PARAMETER_RE)?.[0].replace(/\/$/, '') ?? '';
      const origin = route.match(ORIGIN_RE)?.[1] ?? '';
      const bucketKey = `${origin}:${bucket}:${major}`;
      if (this.routeBuckets.has(route)) this.routeBuckets.delete(route);
      this.routeBuckets.set(route, bucketKey);
    }
    const resetAt = Number.isFinite(resetAfterSec)
      ? Date.now() + Math.max(0, resetAfterSec) * 1000
      : resetSec > 1e12
        ? resetSec
        : resetSec * 1000;
    this.setBucket(route, limitN, remainingN, resetAt);
  }

  prune(): void {
    const now = Date.now();
    for (const [key, state] of this.buckets) {
      if (state.resetAt <= now) this.buckets.delete(key);
    }
    while (this.buckets.size > RateLimitManager.MAX_BUCKETS) {
      const oldest = this.buckets.keys().next().value;
      if (oldest === undefined) break;
      this.buckets.delete(oldest);
    }
    while (this.routeBuckets.size > RateLimitManager.MAX_BUCKETS) {
      const oldest = this.routeBuckets.keys().next().value;
      if (oldest === undefined) break;
      this.routeBuckets.delete(oldest);
    }
  }

  get size(): number {
    return this.buckets.size;
  }
}
