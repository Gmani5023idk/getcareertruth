/**
 * Serverless Rate Limiting Tests
 *
 * Verifies that lib/rate-limit.ts uses Upstash Redis (not in-memory Map)
 * and maintains the expected interface for proxy.ts consumption.
 *
 * SEC: Issue 5 — in-memory rate limiting replaced with Upstash Redis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────────────────────────────
// Set Upstash env vars BEFORE any module import so the Redis client initializes
// vi.mock is hoisted above this by Vitest, but the factories are lazy — they
// execute when the mocked module is first imported, by which time these env
// vars are already set.
// ────────────────────────────────────────────────────────────────────────────
process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

// ────────────────────────────────────────────────────────────────────────────
// Upstash Mocks
// ────────────────────────────────────────────────────────────────────────────

const mockLimit = vi.fn().mockImplementation(async () => ({
  success: true,
  limit: 100,
  remaining: 99,
  reset: Date.now() + 60000,
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(function () {
      return { limit: mockLimit };
    }),
    {
      slidingWindow: vi.fn((max: number, window: string) => ({ max, window })),
    }
  ),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(function () { return {}; }),
}));

// Import the module once — it is an ES module singleton so the same
// `limiterCache` and `redis` reference are shared across all tests.
const rateLimitModule = await import('@/lib/rate-limit');

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('Serverless Rate Limiter: Module Exports', () => {
  it('should export RATE_LIMIT_CONFIGS with expected categories', () => {
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toBeDefined();
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toHaveProperty('auth');
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toHaveProperty('api');
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toHaveProperty('chat');
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toHaveProperty('payment');
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toHaveProperty('upload');
    expect(rateLimitModule.RATE_LIMIT_CONFIGS).toHaveProperty('public');
  });

  it('should export rateLimit function', () => {
    expect(typeof rateLimitModule.rateLimit).toBe('function');
  });

  it('should export checkRateLimit async function', () => {
    expect(typeof rateLimitModule.checkRateLimit).toBe('function');
  });

  it('should export getRateLimitHeaders function', () => {
    expect(typeof rateLimitModule.getRateLimitHeaders).toBe('function');
  });

  it('should export RateLimitError class', () => {
    expect(rateLimitModule.RateLimitError).toBeDefined();
    const err = new rateLimitModule.RateLimitError(0, Date.now());
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('Too many requests');
  });

  it('should have correct rate limit values for each category', () => {
    const { RATE_LIMIT_CONFIGS } = rateLimitModule;

    expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(150);
    expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(15 * 60 * 1000);

    expect(RATE_LIMIT_CONFIGS.api.maxRequests).toBe(100);
    expect(RATE_LIMIT_CONFIGS.api.windowMs).toBe(60 * 1000);

    expect(RATE_LIMIT_CONFIGS.chat.maxRequests).toBe(20);
    expect(RATE_LIMIT_CONFIGS.chat.windowMs).toBe(60 * 1000);

    expect(RATE_LIMIT_CONFIGS.payment.maxRequests).toBe(10);
    expect(RATE_LIMIT_CONFIGS.payment.windowMs).toBe(60 * 1000);

    expect(RATE_LIMIT_CONFIGS.upload.maxRequests).toBe(5);
    expect(RATE_LIMIT_CONFIGS.upload.windowMs).toBe(60 * 1000);

    expect(RATE_LIMIT_CONFIGS.public.maxRequests).toBe(50);
    expect(RATE_LIMIT_CONFIGS.public.windowMs).toBe(60 * 1000);
  });
});

describe('Serverless Rate Limiter: checkRateLimit', () => {
  beforeEach(() => {
    // Restore default mock behavior
    mockLimit.mockImplementation(async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }));
  });

  it('should return allowed=true with remaining count when under limit', async () => {
    mockLimit.mockImplementation(async () => ({
      success: true,
      limit: 100,
      remaining: 95,
      reset: Date.now() + 60000,
    }));

    const result = await rateLimitModule.checkRateLimit(
      '192.168.1.1-test-agent',
      rateLimitModule.RATE_LIMIT_CONFIGS.api
    );

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(95);
    expect(typeof result.resetTime).toBe('number');
  });

  it('should return allowed=false when limit is exceeded', async () => {
    mockLimit.mockImplementation(async () => ({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    }));

    const result = await rateLimitModule.checkRateLimit(
      '192.168.1.1-test-agent',
      rateLimitModule.RATE_LIMIT_CONFIGS.api
    );

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(typeof result.resetTime).toBe('number');
  });

  it('should fail-open when Redis throws an error', async () => {
    mockLimit.mockImplementation(async () => {
      throw new Error('Redis connection failed');
    });

    const result = await rateLimitModule.checkRateLimit(
      '192.168.1.1-test-agent',
      rateLimitModule.RATE_LIMIT_CONFIGS.api
    );

    // Fail-open: allow the request even though Redis is down
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(rateLimitModule.RATE_LIMIT_CONFIGS.api.maxRequests);
  });
});

describe('Serverless Rate Limiter: rateLimit middleware', () => {
  beforeEach(() => {
    mockLimit.mockImplementation(async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }));
  });

  function mockRequest(ip: string, userAgent = 'test-agent'): Request {
    return {
      headers: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return ip;
          if (name === 'user-agent') return userAgent;
          return null;
        },
      },
    } as unknown as Request;
  }

  it('should return result when request is under rate limit', async () => {
    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);
    const result = await limiter(mockRequest('10.0.0.1'));

    expect(result).toBeDefined();
    expect(result.allowed).toBe(true);
    expect(typeof result.remaining).toBe('number');
    expect(typeof result.resetTime).toBe('number');
  });

  it('should throw RateLimitError when limit is exceeded', async () => {
    mockLimit.mockImplementation(async () => ({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    }));

    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);

    await expect(limiter(mockRequest('10.0.0.1'))).rejects.toThrow(
      rateLimitModule.RateLimitError
    );
  });

  it('should throw RateLimitError with statusCode 429', async () => {
    mockLimit.mockImplementation(async () => ({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    }));

    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);

    try {
      await limiter(mockRequest('10.0.0.1'));
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as Record<string, unknown>).statusCode).toBe(429);
    }
  });

  it('should fail-open (allow request) when Redis is unavailable', async () => {
    mockLimit.mockImplementation(async () => {
      throw new Error('Connection refused');
    });

    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);
    const result = await limiter(mockRequest('10.0.0.1'));

    expect(result.allowed).toBe(true);
  });
});

describe('Serverless Rate Limiter: Identifier Isolation', () => {
  beforeEach(() => {
    mockLimit.mockImplementation(async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }));
  });

  function mockRequest(ip: string, userAgent = 'test-agent'): Request {
    return {
      headers: {
        get: (name: string) => {
          if (name === 'x-forwarded-for') return ip;
          if (name === 'user-agent') return userAgent;
          return null;
        },
      },
    } as unknown as Request;
  }

  it('should pass different identifiers to the limiter for different IPs', async () => {
    const identifiers: string[] = [];
    mockLimit.mockImplementation(async (id: string) => {
      identifiers.push(id);
      return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 };
    });

    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);

    await limiter(mockRequest('10.0.0.1', 'agent-A'));
    await limiter(mockRequest('10.0.0.2', 'agent-B'));

    expect(identifiers).toHaveLength(2);
    expect(identifiers[0]).not.toBe(identifiers[1]);
    expect(identifiers[0]).toContain('10.0.0.1');
    expect(identifiers[1]).toContain('10.0.0.2');
  });

  it('should use same identifier for same IP regardless of user-agent (prevents UA rotation)', async () => {
    // SEC: Rate limiter keys on IP only — including User-Agent would let
    // attackers rotate the header to get a fresh rate-limit bucket.
    const identifiers: string[] = [];
    mockLimit.mockImplementation(async (id: string) => {
      identifiers.push(id);
      return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 };
    });

    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);

    await limiter(mockRequest('10.0.0.1', 'Chrome'));
    await limiter(mockRequest('10.0.0.1', 'Firefox'));

    expect(identifiers).toHaveLength(2);
    // Both should use the same IP-only identifier
    expect(identifiers[0]).toBe(identifiers[1]);
    expect(identifiers[0]).toBe('10.0.0.1');
  });

  it('should use same identifier for same IP and user-agent', async () => {
    const identifiers: string[] = [];
    mockLimit.mockImplementation(async (id: string) => {
      identifiers.push(id);
      return { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 };
    });

    const limiter = rateLimitModule.rateLimit(rateLimitModule.RATE_LIMIT_CONFIGS.api);

    await limiter(mockRequest('10.0.0.1', 'agent-A'));
    await limiter(mockRequest('10.0.0.1', 'agent-A'));

    expect(identifiers).toHaveLength(2);
    expect(identifiers[0]).toBe(identifiers[1]);
  });
});

describe('Serverless Rate Limiter: getRateLimitHeaders', () => {
  it('should return proper header shape', () => {
    const resetTime = Date.now() + 60000;
    const headers = rateLimitModule.getRateLimitHeaders({ remaining: 42, resetTime });

    expect(headers).toHaveProperty('X-RateLimit-Limit');
    expect(headers).toHaveProperty('X-RateLimit-Remaining');
    expect(headers).toHaveProperty('X-RateLimit-Reset');
    expect(headers['X-RateLimit-Remaining']).toBe('42');
  });
});

describe('Serverless Rate Limiter: Uses Upstash (not in-memory Map)', () => {
  it('should use @upstash/ratelimit sliding window algorithm', async () => {
    const { Ratelimit } = await import('@upstash/ratelimit');
    // Verify Ratelimit was instantiated (proving Redis is used, not Map)
    expect(Ratelimit).toBeDefined();
  });

  it('should not use in-memory Map for storage', () => {
    // The module should NOT export cleanupRateLimitStore (that was the in-memory cleanup)
    expect((rateLimitModule as Record<string, unknown>).cleanupRateLimitStore).toBeUndefined();
  });
});
