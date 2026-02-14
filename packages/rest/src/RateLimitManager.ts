/**
 * Tracks rate limit state per bucket (route hash).
 * Delays requests when limit is exceeded.
 */
export interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: number;
}

export class RateLimitManager {
  private buckets = new Map<string, RateLimitState>();
  private globalResetAt = 0;

  getBucket(route: string): RateLimitState | undefined {
    return this.buckets.get(route);
  }

  setBucket(route: string, limit: number, remaining: number, resetAt: number): void {
    this.buckets.set(route, { limit, remaining, resetAt });
  }

  setGlobalReset(resetAt: number): void {
    this.globalResetAt = resetAt;
  }

  getGlobalReset(): number {
    return this.globalResetAt;
  }

  /** Returns ms to wait before we can send again (0 if no wait). */
  getWaitTime(route: string): number {
    const now = Date.now();
    const globalWait = this.globalResetAt > now ? this.globalResetAt - now : 0;
    const bucket = this.buckets.get(route);
    const bucketWait = bucket && bucket.remaining <= 0 && bucket.resetAt > now ? bucket.resetAt - now : 0;
    return Math.max(globalWait, bucketWait);
  }

  /** Parse rate limit headers and update state. */
  updateFromHeaders(route: string, headers: Headers): void {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    if (limit !== null && remaining !== null && reset !== null) {
      const resetAt = parseInt(reset, 10) * 1000;
      this.setBucket(route, parseInt(limit, 10), parseInt(remaining, 10), resetAt);
    }
    const retryAfter = headers.get('Retry-After');
    if (retryAfter !== null) {
      const sec = parseInt(retryAfter, 10);
      const resetAt = Date.now() + (isNaN(sec) ? 0 : sec * 1000);
      this.setBucket(route, 1, 0, resetAt);
    }
  }
}
