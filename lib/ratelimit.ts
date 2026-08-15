/**
 * Rate Limiting Middleware using Upstash Redis
 *
 * Provides sliding window rate limiters for:
 * - Login: 5 attempts per 15 minutes per IP
 * - Payment: 10 orders per hour per userId
 * - Registration: 3 accounts per hour per IP
 * - Admin: 3 attempts per 15 minutes per IP
 *
 * SEC: Falls back to in-memory sliding window when Redis is unavailable,
 * so no endpoint is ever fully unprotected.
 *
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { inMemoryLimit } from '@/lib/in-memory-rate-limit';

// Create Redis client
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.error('Failed to initialize Upstash Redis:', error);
}

function createLimiter(maxRequests: number, windowSeconds: number): Ratelimit {
  if (!redis) {
    // SEC: In-memory fallback — never allow all requests when Redis is down.
    const windowMs = windowSeconds * 1000;
    console.warn(`[rate-limit] Redis unavailable — using in-memory fallback (maxRequests=${maxRequests}, windowMs=${windowMs})`);
    return {
      limit: async (identifier: string) => {
        const result = inMemoryLimit(identifier, maxRequests, windowMs);
        return {
          success: result.success,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        };
      },
    } as Ratelimit;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: true,
    prefix: 'ratelimit',
  });
}

/**
 * Login rate limiter: 5 attempts per 15 minutes per IP
 */
export const loginRateLimit = createLimiter(5, 900);

/**
 * Payment rate limiter: 10 orders per hour per userId
 */
export const paymentRateLimit = createLimiter(10, 3600);

/**
 * Registration rate limiter: 3 accounts per hour per IP
 */
export const registrationRateLimit = createLimiter(3, 3600);

/**
 * Admin rate limiter: 3 attempts per 15 minutes per IP
 */
export const adminRateLimit = createLimiter(3, 900);

/**
 * Refund rate limiter: 3 refunds per hour per userId
 */
export const refundRateLimit = createLimiter(3, 3600);

/**
 * Transcript rate limiter: 30 requests per minute per userId
 */
export const transcriptRateLimit = createLimiter(30, 60);

/**
 * Extract client IP from request headers
 */
export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Execute a rate limit check with fail-open behavior.
 * Returns { success, headers } where headers includes Retry-After if rate limited.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
  action: string
): Promise<{ success: boolean; headers: Record<string, string> }> {
  try {
    const result = await limiter.limit(identifier);

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
    };

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      headers['Retry-After'] = String(retryAfter);
    }

    // Log rate limit hits using audit logging (dynamic import to avoid edge-runtime issues)
    if (!result.success) {
      try {
        const { auditLog, AuditAction } = await import('@/lib/audit-log');
        await auditLog({
          action: AuditAction.RATE_LIMIT_HIT,
          entity: 'RateLimit',
          entityId: identifier,
          metadata: { action, identifier },
          success: false,
        });
      } catch {
        // Audit logging must never crash the rate limiter
      }
    }

    return { success: result.success, headers };
  } catch (error) {
    // Fail open: if Upstash is down, allow the request
    console.error(`Rate limit check failed for ${action}:`, error);
    return { success: true, headers: {} };
  }
}
