/**
 * retry — Exponential Backoff Retry Utility
 * ===========================================
 *
 * Wraps any async function with automatic retries using exponential backoff
 * + full jitter. Designed for transient failures (network timeouts, 429/503
 * HTTP responses, rate limits, etc.).
 *
 * Usage:
 *   const result = await withRetry(() => createZoomMeeting(opts), {
 *     maxRetries: 3,
 *     baseDelayMs: 1000,
 *   });
 *
 * The function will retry up to `maxRetries` times with delays of:
 *   ~1000ms, ~2000ms, ~4000ms (with jitter)
 */

// ────────────────────────────────────────────────────────────────────
// Options
// ────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Maximum number of retry attempts (not counting the initial call).
   *  Default: 3 */
  maxRetries?: number;
  /** Base delay in milliseconds before the first retry.
   *  Each retry doubles this: base, base*2, base*4, ...
   *  Default: 1000 */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds.
   *  Default: 30_000 (30 seconds) */
  maxDelayMs?: number;
  /** Optional predicate to decide whether a specific error should trigger
   *  a retry. If omitted, ALL errors trigger retries (up to maxRetries). */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Optional label for log messages. Helps identify which operation is
   *  being retried. */
  label?: string;
}

// ────────────────────────────────────────────────────────────────────
// Defaults
// ────────────────────────────────────────────────────────────────────

const DEFAULTS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  shouldRetry: () => true, // retry all errors by default
  label: 'operation',
};

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Full jitter implementation.
 * Returns a random delay value between 0 and `cap`.
 * This avoids thundering-herd problems better than decorrelated jitter.
 * Reference: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
function jitterDelay(cap: number): number {
  return Math.random() * cap;
}

/**
 * Calculate delay for attempt `attempt` (1-based).
 * delay = min(base * 2^(attempt-1), maxDelay)
 * then apply full jitter.
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exponentialCap = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
  return jitterDelay(exponentialCap);
}

// ────────────────────────────────────────────────────────────────────
// Main retry wrapper
// ────────────────────────────────────────────────────────────────────

/**
 * Wraps an async function with exponential backoff retry logic.
 *
 * @param fn - The async function to execute (and potentially retry).
 * @param options - Retry configuration (see RetryOptions).
 * @returns The result of `fn` if it succeeds.
 * @throws The LAST error thrown by `fn` if all retries are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config: Required<RetryOptions> = { ...DEFAULTS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this was the last allowed attempt, stop retrying
      if (attempt > config.maxRetries) {
        break;
      }

      // If the error does not meet the retry criteria, stop
      if (!config.shouldRetry(error, attempt)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config.baseDelayMs, config.maxDelayMs);

      // In dev/staging, log the retry for observability
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[retry] ${config.label} failed (attempt ${attempt}/${config.maxRetries + 1}). ` +
          `Retrying in ${Math.round(delay)}ms...`,
          error instanceof Error ? error.message : error
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted — throw the last error
  throw lastError;
}

/**
 * Convenience: wraps a synchronous function with retry.
 * The function is still called using `await` (allows async callbacks).
 */
export function withRetrySync<T>(
  fn: () => T,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(() => Promise.resolve(fn()), options);
}
