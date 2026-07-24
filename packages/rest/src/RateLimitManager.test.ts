import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimitManager } from './RateLimitManager.js';

describe('RateLimitManager', () => {
  let manager: RateLimitManager;

  beforeEach(() => {
    manager = new RateLimitManager();
  });

  it('getBucket returns undefined for unknown route', () => {
    expect(manager.getBucket('unknown')).toBeUndefined();
  });

  it('setBucket and getBucket', () => {
    manager.setBucket('/channels/:id', 5, 3, Date.now() + 60000);
    const bucket = manager.getBucket('/channels/:id');
    expect(bucket).toEqual({ limit: 5, remaining: 3, resetAt: expect.any(Number) });
  });

  it('getWaitTime returns 0 when no limit', () => {
    expect(manager.getWaitTime('any')).toBe(0);
  });

  it('getWaitTime returns wait when bucket exhausted', () => {
    const resetAt = Date.now() + 5000;
    manager.setBucket('route', 5, 0, resetAt);
    const wait = manager.getWaitTime('route');
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(5000);
  });

  it('getWaitTime returns 0 when resetAt in past', () => {
    manager.setBucket('route', 5, 0, Date.now() - 1000);
    expect(manager.getWaitTime('route')).toBe(0);
  });

  it('prune drops expired buckets including remaining=0', () => {
    manager.setBucket('expired', 5, 0, Date.now() - 1);
    manager.setBucket('live', 5, 0, Date.now() + 60_000);
    manager.prune();
    expect(manager.getBucket('expired')).toBeUndefined();
    expect(manager.getBucket('live')).toBeDefined();
  });

  it('caps buckets at MAX via LRU eviction', () => {
    const max = 2_000;
    for (let i = 0; i < max + 50; i++) {
      manager.setBucket(`r${i}`, 1, 0, Date.now() + 60_000);
    }
    expect(manager.size).toBeLessThanOrEqual(max);
    expect(manager.getBucket(`r${max + 49}`)).toBeDefined();
  });

  it('setGlobalReset and getGlobalReset', () => {
    const resetAt = Date.now() + 10000;
    manager.setGlobalReset(resetAt);
    expect(manager.getGlobalReset()).toBe(resetAt);
  });

  it('getWaitTime considers global reset', () => {
    const resetAt = Date.now() + 3000;
    manager.setGlobalReset(resetAt);
    const wait = manager.getWaitTime('any-route');
    expect(wait).toBeGreaterThan(0);
  });

  it('updateFromHeaders parses X-RateLimit headers', () => {
    const route = 'GET /channels/11111111111111111/messages';
    const sharedRoute = 'POST /channels/11111111111111111/messages';
    const otherChannel = 'GET /channels/22222222222222222/messages';
    const headers = new Headers({
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': '2',
      'X-RateLimit-Reset-After': '1.5',
      'X-RateLimit-Bucket': 'bucket-1',
    });
    manager.updateFromHeaders(route, headers);
    const bucket = manager.getBucket(route);
    expect(bucket?.limit).toBe(5);
    expect(bucket?.remaining).toBe(2);
    expect(bucket?.resetAt).toBeGreaterThan(Date.now() + 1_000);

    const sharedHeaders = new Headers(headers);
    sharedHeaders.set('X-RateLimit-Remaining', '1');
    manager.updateFromHeaders(sharedRoute, sharedHeaders);
    const otherHeaders = new Headers(headers);
    otherHeaders.set('X-RateLimit-Remaining', '4');
    manager.updateFromHeaders(otherChannel, otherHeaders);
    expect(manager.getBucket(route)?.remaining).toBe(1);
    expect(manager.getBucket(otherChannel)?.remaining).toBe(4);
  });

  it('updateFromHeaders ignores Retry-After (handled on 429 path)', () => {
    const headers = new Headers({ 'Retry-After': '10' });
    manager.updateFromHeaders('/global', headers);
    expect(manager.getBucket('/global')).toBeUndefined();
  });
});
