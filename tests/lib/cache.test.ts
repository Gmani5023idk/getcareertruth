/**
 * Unit tests: Cache Module (lib/cache.ts)
 * =========================================
 *
 * Covers:
 *   - getOrSet: cache hit (TTL not expired), cache miss, TTL expiry
 *   - invalidate: exact key, prefix wildcard, non-existent key
 *   - flush: clears all entries
 *   - get: returns value, undefined on miss, undefined on expired
 *   - Cache key generators (cacheKeys)
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Import the cache module. Since it uses module-level state (Map), we
// need to manage isolation between tests carefully.
import { getOrSet, invalidate, flush, get, cacheKeys } from '@/lib/cache';

describe('cache module', () => {
  beforeEach(() => {
    flush(); // Clean slate before each test
  });

  // ── getOrSet ─────────────────────────────────────────────────

  describe('getOrSet()', () => {
    it('returns cached value on cache hit (within TTL)', async () => {
      const fetcher = vi.fn().mockResolvedValue('computed-value');
      const result1 = await getOrSet('key1', fetcher, 60_000);
      expect(result1).toBe('computed-value');
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call — should return cached value, not call fetcher
      const result2 = await getOrSet('key1', fetcher, 60_000);
      expect(result2).toBe('computed-value');
      expect(fetcher).toHaveBeenCalledTimes(1); // still 1
    });

    it('calls fetcher again after TTL expires', async () => {
      const fetcher = vi.fn().mockResolvedValue('fresh-value');
      await getOrSet('ttl-key', fetcher, 10); // 10ms TTL

      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 20));

      const result = await getOrSet('ttl-key', fetcher, 60_000);
      expect(result).toBe('fresh-value');
      expect(fetcher).toHaveBeenCalledTimes(2); // called again
    });

    it('uses default TTL of 60s when not specified', async () => {
      const fetcher = vi.fn().mockResolvedValue('default-ttl');
      await getOrSet('default-ttl', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('handles fetcher rejection gracefully (propagates error)', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('DB down'));
      await expect(getOrSet('err-key', fetcher)).rejects.toThrow('DB down');
    });

    it('stores different keys independently', async () => {
      const fetcher1 = vi.fn().mockResolvedValue('value-1');
      const fetcher2 = vi.fn().mockResolvedValue('value-2');

      const [v1, v2] = await Promise.all([
        getOrSet('key-a', fetcher1),
        getOrSet('key-b', fetcher2),
      ]);

      expect(v1).toBe('value-1');
      expect(v2).toBe('value-2');
      expect(fetcher1).toHaveBeenCalledTimes(1);
      expect(fetcher2).toHaveBeenCalledTimes(1);
    });
  });

  // ── invalidate ───────────────────────────────────────────────

  describe('invalidate()', () => {
    it('invalidates an exact key', async () => {
      await getOrSet('exact-key', () => Promise.resolve('data'));
      expect(get('exact-key')).toBe('data');

      invalidate('exact-key');
      expect(get('exact-key')).toBeUndefined();
    });

    it('invalidates all keys matching a prefix pattern', async () => {
      await Promise.all([
        getOrSet('reviews:employee:abc:page1', () => Promise.resolve('r1')),
        getOrSet('reviews:employee:abc:page2', () => Promise.resolve('r2')),
        getOrSet('employees:list', () => Promise.resolve('e1')),
      ]);

      invalidate('reviews:employee:abc:*');
      expect(get('reviews:employee:abc:page1')).toBeUndefined();
      expect(get('reviews:employee:abc:page2')).toBeUndefined();
      // Should NOT invalidate unrelated keys
      expect(get('employees:list')).toBe('e1');
    });

    it('does nothing when key does not exist', () => {
      expect(() => invalidate('nonexistent')).not.toThrow();
    });

    it('does nothing when no keys match a wildcard pattern', () => {
      expect(() => invalidate('nothing-here:*')).not.toThrow();
    });
  });

  // ── flush ────────────────────────────────────────────────────

  describe('flush()', () => {
    it('clears all cached entries', async () => {
      await Promise.all([
        getOrSet('a', () => Promise.resolve(1)),
        getOrSet('b', () => Promise.resolve(2)),
      ]);

      flush();

      expect(get('a')).toBeUndefined();
      expect(get('b')).toBeUndefined();
    });
  });

  // ── get ──────────────────────────────────────────────────────

  describe('get()', () => {
    it('returns value when key exists and TTL is valid', async () => {
      await getOrSet('get-test', () => Promise.resolve('stored'));
      expect(get<string>('get-test')).toBe('stored');
    });

    it('returns undefined when key does not exist', () => {
      expect(get('no-such-key')).toBeUndefined();
    });

    it('returns undefined when TTL has expired', async () => {
      await getOrSet('expired-key', () => Promise.resolve('val'), 10);
      await new Promise((r) => setTimeout(r, 20));
      expect(get('expired-key')).toBeUndefined();
    });
  });

  // ── cacheKeys ────────────────────────────────────────────────

  describe('cacheKeys', () => {
    it('generates employees list key', () => {
      expect(cacheKeys.employeesList(1)).toBe('employees:list:1:all');
      expect(cacheKeys.employeesList(2, 'tech')).toBe('employees:list:2:tech');
    });

    it('generates employee profile key', () => {
      expect(cacheKeys.employeeProfile('abc')).toBe('employee:abc');
    });

    it('generates reviews for employee key', () => {
      expect(cacheKeys.reviewsForEmployee('emp-1')).toBe('reviews:emp-1');
    });
  });
});
