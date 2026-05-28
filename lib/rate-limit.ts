/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting for API routes to prevent abuse and DDoS attacks.
 * Uses in-memory storage for simplicity. For production, consider using Redis.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

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
 * Get client identifier from request
 */
function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';

  // Add user agent to make it more specific
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return `${ip}-${userAgent}`;
}

/**
 * Check if request is rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(identifier);
  }

  // Get or create entry
  const currentEntry = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + config.windowMs,
  };

  // Check if limit exceeded
  if (currentEntry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: currentEntry.resetTime,
    };
  }

  // Increment count
  currentEntry.count++;
  rateLimitStore.set(identifier, currentEntry);

  return {
    allowed: true,
    remaining: config.maxRequests - currentEntry.count,
    resetTime: currentEntry.resetTime,
  };
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
 * Rate limit middleware for Next.js API routes
 */
export function rateLimit(config: RateLimitConfig) {
  return (request: Request) => {
    const identifier = getClientIdentifier(request);
    const result = checkRateLimit(identifier, config);

    if (!result.allowed) {
      throw new RateLimitError(result.remaining, result.resetTime);
    }

    return result;
  };
}

/**
 * Clean up expired rate limit entries
 * Run this periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
  };
}
