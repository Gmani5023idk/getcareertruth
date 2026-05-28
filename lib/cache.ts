/**
 * cache.ts — In-memory cache layer for GetCareerTruth
 * ====================================================
 * Replaces direct DB hits for frequently read, rarely changed data.
 * Uses a simple Map with TTL. For production, swap to Redis by
 * changing the `store` and `cache` implementation below.
 *
 * Usage:
 *   const data = await cache.getOrSet('key', fetchFn, 60_000);
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** In-memory store. Production: replace with Redis (ioredis / @upstash/redis). */
const store = new Map<string, CacheEntry<unknown>>();

// Sweep expired entries every 5 min to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Get a cached value or compute + cache it atomically.
 *
 * @param key     - Unique cache key
 * @param fetcher - Async fn that returns data on cache miss
 * @param ttlMs   - TTL in ms (default 60s)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60_000,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await fetcher();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Invalidate one or more keys. Use trailing `*` for prefix matching.
 *
 * @example
 *   cache.invalidate('employees:*');   // flush all employee keys
 *   cache.invalidate('reviews:abc'); // flush specific review key
 */
export function invalidate(keyOrPattern: string): void {
  if (keyOrPattern.endsWith('*')) {
    const prefix = keyOrPattern.slice(0, -1);
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  } else {
    store.delete(keyOrPattern);
  }
}

/** Flush all cache entries. */
export function flush(): void {
  store.clear();
}

/** Get cached value without populating. Returns undefined on miss/expired. */
export function get<T>(key: string): T | undefined {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

// ─── Cache key generators ─────────────────────────────────────────────

export const cacheKeys = {
  employeesList: (page: number, industry?: string) =>
    `employees:list:${page}:${industry ?? 'all'}`,

  employeeProfile: (id: string) => `employee:${id}`,

  reviewsForEmployee: (employeeId: string) => `reviews:${employeeId}`,
};