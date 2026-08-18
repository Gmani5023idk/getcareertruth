/**
 * In-Memory Sliding Window Rate Limiter
 *
 * SEC: Fallback when Upstash Redis is unavailable. Provides per-instance
 * rate limiting so no endpoint is ever fully unprotected. Not shared across
 * serverless instances — use Redis for production, this is the safety net.
 *
 * Includes periodic cleanup to prevent memory leaks from stale entries.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Periodic cleanup every 5 minutes to remove stale entries
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // Remove entries older than 1 hour

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanupIfNeeded() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < STALE_THRESHOLD_MS);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow the process to exit even if the timer is running
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check rate limit using in-memory sliding window.
 * Returns { success, limit, remaining, reset } matching @upstash/ratelimit shape.
 */
export function inMemoryLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  startCleanupIfNeeded();

  const now = Date.now();
  const windowStart = now - windowMs;
  const key = identifier;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  const currentCount = entry.timestamps.length;

  if (currentCount >= maxRequests) {
    // Rate limited — calculate when the oldest request in the window expires
    const oldestInWindow = entry.timestamps[0];
    const reset = oldestInWindow + windowMs;
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset,
    };
  }

  // Allow — record this request
  entry.timestamps.push(now);
  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - currentCount - 1,
    reset: now + windowMs,
  };
}

/**
 * Get the number of tracked identifiers (for monitoring/debugging).
 */
export function getInMemoryStoreSize(): number {
  return store.size;
}

/**
 * Clear all stored entries (for testing).
 */
export function clearInMemoryStore(): void {
  store.clear();
}
