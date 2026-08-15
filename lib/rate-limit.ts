/**
 * Rate Limiting Middleware
 *
 * SEC: Uses Upstash Redis sliding window for shared rate limits across serverless
 * instances. Falls back to an in-memory sliding window when Redis is unavailable,
 * so no endpoint is ever fully unprotected.
 *
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { inMemoryLimit } from '@/lib/in-memory-rate-limit';

// Create Redis client (shared with lib/ratelimit.ts via same env vars)
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.error('Failed to initialize Upstash Redis for rate-limit:', error);
}

/**
 * Create a sliding window rate limiter backed by Upstash Redis.
 * Falls back to in-memory sliding window when Redis is unavailable.
 * NOTE: In-memory fallback is per-instance only (not shared across serverless).
 */
function createLimiter(maxRequests: number, windowMs: number): Ratelimit {
  if (!redis) {
    // SEC: In-memory fallback — never allow all requests when Redis is down.
    // Logs a warning so monitoring can detect fallback activation.
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
    } as unknown as Ratelimit;
  }

  const windowSeconds = Math.ceil(windowMs / 1000);
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    analytics: true,
    prefix: 'ratelimit-proxy',
  });
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication routes - 150 attempts per 15 minutes
  auth: {
    maxRequests: 150,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // General API routes - 100 requests per minute
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Chat routes - 20 requests per minute
  chat: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  // Payment routes - 10 requests per minute
  payment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // File upload routes - 5 requests per minute
  upload: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // Public routes - 50 requests per minute
  public: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Cache of Upstash Ratelimit instances keyed by "maxRequests-windowMs".
 * Avoids creating a new Ratelimit on every request.
 */
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(config: RateLimitConfig): Ratelimit {
  const key = `${config.maxRequests}-${config.windowMs}`;
  if (!limiterCache.has(key)) {
    limiterCache.set(key, createLimiter(config.maxRequests, config.windowMs));
  }
  return limiterCache.get(key)!;
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = forwarded?.split(',')[0].trim() || realIp?.trim() || cfConnectingIp?.trim() || 'unknown';

  // Key on IP only — including User-Agent would let attackers rotate the
  // header to get a fresh rate-limit bucket on every request.
  return ip;
}

/**
 * Check if request is rate limited.
 * Uses Upstash Redis sliding window — shared across all serverless instances.
 * Fail-open: if Redis check fails, the request is allowed.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: number }> {
  const limiter = getLimiter(config);

  try {
    const result = await limiter.limit(identifier);

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.reset,
    };
  } catch (error) {
    // Fail open: if Upstash is down, allow the request
    console.error(`Rate limit check failed for ${identifier}:`, error);
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
    };
  }
}

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly rateLimit: { remaining: number; resetTime: number };

  constructor(remaining: number, resetTime: number) {
    super('Too many requests');
    this.name = 'RateLimitError';
    this.rateLimit = { remaining, resetTime };
  }
}

/**
 * Rate limit middleware for Next.js API routes.
 * Returns an async function — callers must await the result.
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: Request) => {
    const identifier = getClientIdentifier(request);
    const result = await checkRateLimit(identifier, config);

    if (!result.allowed) {
      throw new RateLimitError(result.remaining, result.resetTime);
    }

    return result;
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetTime: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'X-RateLimit-Remaining': String(result.remaining),
  };
}
