/**
 * Edge-Compatible Rate Limiting Helper
 *
 * Designed for use in Next.js middleware (Edge Runtime).
 * Only depends on @upstash/redis (uses fetch under the hood — no Node.js built-ins).
 * No dependency on Prisma or audit-log, so it works on Vercel Edge Runtime.
 *
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client (edge-compatible — uses fetch)
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.error('Failed to initialize Upstash Redis (edge):', error);
}

function createLimiter(maxRequests: number, windowSeconds: number): Ratelimit {
  if (!redis) {
    return {
      limit: async (identifier: string) => {
        console.warn(`[Edge] Rate limiter unavailable (Redis not configured), allowing ${identifier}`);
        return { success: true, limit: maxRequests, remaining: maxRequests, reset: Date.now() };
      },
    } as Ratelimit;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: true,
    prefix: 'ratelimit-edge',
  });
}

/**
 * Admin rate limiter: 3 requests per 15 minutes per IP
 * Used in middleware.ts for Edge Runtime compatibility.
 */
export const adminRateLimit = createLimiter(3, 900);

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP
 */
export const loginRateLimit = createLimiter(5, 900);

/**
 * Extract client IP from request headers (edge-compatible).
 */
export function extractClientIp(request: { headers: { get: (name: string) => string | null } }): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Execute a rate limit check with fail-open behavior, returning HTTP headers.
 * Pure function — no audit-log dependency so it works on edge.
 *
 * Returns { success, retryAfterSeconds } where retryAfterSeconds is set only when rate limited.
 */
export async function checkRateLimitSimple(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; retryAfterSeconds: number }> {
  try {
    const result = await limiter.limit(identifier);
    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return { success: false, retryAfterSeconds: Math.max(1, retryAfter) };
    }
    return { success: true, retryAfterSeconds: 0 };
  } catch (error) {
    // Fail open: if Upstash is down, allow the request
    console.error('[Edge] Rate limit check failed (allowing request):', error);
    return { success: true, retryAfterSeconds: 0 };
  }
}
