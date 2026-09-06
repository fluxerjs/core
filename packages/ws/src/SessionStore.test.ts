import { describe, expect, it, vi } from 'vitest';
import { SimpleIdentifyThrottler } from './IdentifyThrottler.js';
import { isSessionInfoFresh, MemorySessionStore } from './SessionStore.js';

describe('MemorySessionStore', () => {
  it('stores and retrieves session info', () => {
    const store = new MemorySessionStore({ ttlMs: 60_000 });
    store.updateSessionInfo(0, {
      sessionId: 'abc',
      sequence: 12,
      updatedAt: Date.now(),
    });
    expect(store.retrieveSessionInfo(0)).toEqual(
      expect.objectContaining({ sessionId: 'abc', sequence: 12 }),
    );
  });

  it('discards expired sessions', () => {
    const store = new MemorySessionStore({ ttlMs: 100 });
    store.updateSessionInfo(1, {
      sessionId: 'old',
      sequence: 1,
      updatedAt: Date.now() - 500,
    });
    expect(store.retrieveSessionInfo(1)).toBeNull();
  });

  it('clears on null update', () => {
    const store = new MemorySessionStore();
    store.updateSessionInfo(2, { sessionId: 'x', sequence: 1, updatedAt: Date.now() });
    store.updateSessionInfo(2, null);
    expect(store.retrieveSessionInfo(2)).toBeNull();
  });
});

describe('isSessionInfoFresh', () => {
  it('honours ttl', () => {
    const now = 1_000_000;
    expect(
      isSessionInfoFresh({ sessionId: 'a', sequence: 1, updatedAt: now - 59_000 }, 60_000, now),
    ).toBe(true);
    expect(
      isSessionInfoFresh({ sessionId: 'a', sequence: 1, updatedAt: now - 61_000 }, 60_000, now),
    ).toBe(false);
  });
});

describe('SimpleIdentifyThrottler', () => {
  it('runs identify callbacks', async () => {
    const throttler = new SimpleIdentifyThrottler({ maxConcurrency: 2, maxPerWindow: 10 });
    const fn = vi.fn().mockResolvedValue(42);
    await expect(throttler.waitForIdentify(0, fn)).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
    throttler.destroy();
  });

  it('respects concurrency', async () => {
    const throttler = new SimpleIdentifyThrottler({ maxConcurrency: 1, maxPerWindow: 100 });
    let concurrent = 0;
    let maxConcurrent = 0;
    const make = (): Promise<void> =>
      throttler.waitForIdentify(0, async () => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 30));
        concurrent -= 1;
      });
    await Promise.all([make(), make(), make()]);
    expect(maxConcurrent).toBe(1);
    throttler.destroy();
  });
});
