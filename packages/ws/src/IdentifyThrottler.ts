/**
 * Identify / session-start throttling for Fluxer.
 *
 * Fluxer does not bucket IDENTIFYs by `max_concurrency`.
 * Real limits (verified against fluxer_gateway):
 * - 300 IDENTIFYs per IP per 60s
 * - 512 global concurrent session starts (default)
 */

export interface IIdentifyThrottler {
  /**
   * Wait until an IDENTIFY may be sent for `shardId`, then run `fn`.
   * Implementations must release the slot when `fn` settles.
   */
  waitForIdentify<T>(shardId: number, fn: () => Promise<T>): Promise<T>;
  destroy?(): void;
}

export interface SimpleIdentifyThrottlerOptions {
  /** Max concurrent IDENTIFYs in flight. @default 16 */
  maxConcurrency?: number;
  /** Max IDENTIFYs per window. @default 300 */
  maxPerWindow?: number;
  /** Window length in ms. @default 60_000 */
  windowMs?: number;
}

/**
 * Concurrency gate + sliding-window token bucket sized for Fluxer's per-IP limits.
 */
export class SimpleIdentifyThrottler implements IIdentifyThrottler {
  private readonly maxConcurrency: number;
  private readonly maxPerWindow: number;
  private readonly windowMs: number;
  private inFlight = 0;
  private readonly timestamps: number[] = [];
  private readonly waiters: Array<() => void> = [];
  private destroyed = false;

  constructor(options: SimpleIdentifyThrottlerOptions = {}) {
    this.maxConcurrency = options.maxConcurrency ?? 16;
    this.maxPerWindow = options.maxPerWindow ?? 300;
    this.windowMs = options.windowMs ?? 60_000;
  }

  async waitForIdentify<T>(shardId: number, fn: () => Promise<T>): Promise<T> {
    void shardId;
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const wake of this.waiters.splice(0)) wake();
  }

  private async acquire(): Promise<void> {
    for (;;) {
      if (this.destroyed) {
        throw new Error('Identify throttler destroyed');
      }
      this.prune();
      if (this.inFlight < this.maxConcurrency && this.timestamps.length < this.maxPerWindow) {
        this.inFlight += 1;
        this.timestamps.push(Date.now());
        return;
      }
      const waitMs = this.nextWaitMs();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          const idx = this.waiters.indexOf(wake);
          if (idx >= 0) this.waiters.splice(idx, 1);
          resolve();
        }, waitMs);
        const wake = (): void => {
          clearTimeout(timer);
          resolve();
        };
        this.waiters.push(wake);
      });
    }
  }

  private release(): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const wake = this.waiters.shift();
    wake?.();
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && (this.timestamps[0] as number) <= cutoff) {
      this.timestamps.shift();
    }
  }

  private nextWaitMs(): number {
    if (this.inFlight >= this.maxConcurrency) return 25;
    this.prune();
    if (this.timestamps.length < this.maxPerWindow) return 25;
    const oldest = this.timestamps[0] ?? Date.now();
    return Math.max(25, oldest + this.windowMs - Date.now() + 1);
  }
}
