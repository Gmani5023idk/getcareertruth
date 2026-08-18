/**
 * Integration tests: Proxy Pipeline — Uncovered Scenarios
 * ============================================================
 *
 * Complements tests/edge/proxy.test.ts by covering proxy
 * features that the edge tests do NOT exercise:
 *   - CORS headers on API responses
 *   - OPTIONS preflight handling
 *   - 429 rate limit response
 *   - CSP nonce injection
 *   - Full security header coverage
 *
 * NOTE: The edge tests already cover admin auth, CSRF, dashboard
 * protection, auth redirects, HTTPS, and file upload validation.
 * This file intentionally avoids duplicating those scenarios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

let mockToken: Record<string, unknown> | null = null;
let mockRateLimitResult: { allowed: boolean; remaining: number; resetTime: number } = {
  allowed: true,
  remaining: 99,
  resetTime: Date.now() + 60000,
};

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(() => Promise.resolve(mockToken)),
}));

const mockGetRateLimitHeaders = vi.fn(() => ({
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '99',
}));

const mockRateLimitFn = vi.fn(() => async (_req: unknown) => mockRateLimitResult);

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: mockRateLimitFn,
  RATE_LIMIT_CONFIGS: {
    auth: { maxRequests: 150, windowMs: 900000 },
    chat: { maxRequests: 20, windowMs: 60000 },
    payment: { maxRequests: 10, windowMs: 60000 },
    api: { maxRequests: 100, windowMs: 60000 },
  },
  getRateLimitHeaders: mockGetRateLimitHeaders,
}));

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function mockRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000');
  const method = options?.method || 'GET';
  const customHeaders = options?.headers || {};

  const headerMap = new Map<string, string>();
  for (const [key, value] of Object.entries(customHeaders)) {
    headerMap.set(key.toLowerCase(), value);
  }

  return {
    method,
    url: urlObj.toString(),
    nextUrl: {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      href: urlObj.href,
      origin: urlObj.origin,
      clone: () => new URL(urlObj.toString()),
    } as unknown as URL,
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) || null,
      set: (name: string, value: string) => headerMap.set(name.toLowerCase(), value),
      forEach: (cb: (value: string, key: string) => void) => headerMap.forEach(cb),
      entries: () => headerMap.entries(),
    } as unknown as Headers,
    clone: () => mockRequest(url, options),
    text: async () => options?.body || '',
    json: async () => (options?.body ? JSON.parse(options.body) : {}),
  } as unknown as NextRequest;
}

// ────────────────────────────────────────────────────────────────────────────
// Import AFTER mocks
// ────────────────────────────────────────────────────────────────────────────

const { proxy } = await import('@/proxy');

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('Proxy Pipeline: CORS Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    mockRateLimitResult = { allowed: true, remaining: 99, resetTime: Date.now() + 60000 };
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '');
    mockRateLimitFn.mockImplementation(() => async () => mockRateLimitResult);
    mockGetRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' });
  });

  it('sets Access-Control-Allow-Origin on API response for allowed origin', async () => {
    const req = mockRequest('http://localhost:3000/api/employees', {
      headers: { Origin: 'http://localhost:3000' },
    });
    const res = await proxy(req);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does NOT set CORS headers when origin is not in allowed list (GET exempt from CSRF)', async () => {
    // GET requests are exempt from CSRF — evil.com origin passes through
    // but CORS headers are not set because origin is not in ALLOWED_ORIGINS
    const req = mockRequest('http://localhost:3000/api/employees', {
      headers: { Origin: 'https://evil.com' },
    });
    const res = await proxy(req);
    expect(res.status).not.toBe(403); // GET exempt from CSRF
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeFalsy(); // no CORS header
  });

  it('does NOT set CORS headers when no origin is present', async () => {
    const req = mockRequest('http://localhost:3000/api/employees');
    const res = await proxy(req);
    // No origin → CSRF bypass, CORS headers not set (GET exempt from CORS origin check)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeFalsy();
  });
});

describe('Proxy Pipeline: OPTIONS Preflight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '');
    mockRateLimitFn.mockImplementation(() => async () => mockRateLimitResult);
    mockGetRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' });
  });

  it('returns 204 with CORS headers for OPTIONS request from allowed origin', async () => {
    const req = mockRequest('http://localhost:3000/api/bookings', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    const res = await proxy(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('returns 204 for OPTIONS request without origin (server-to-server)', async () => {
    const req = mockRequest('http://localhost:3000/api/bookings', {
      method: 'OPTIONS',
    });
    const res = await proxy(req);
    expect(res.status).toBe(204);
  });

  it('falls through for OPTIONS request from disallowed origin', async () => {
    // OPTIONS from evil.com is not in ALLOWED_ORIGINS, so the CORS handler
    // does NOT return 204 — the request falls through to the rest of middleware
    const req = mockRequest('http://localhost:3000/api/bookings', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.com' },
    });
    const res = await proxy(req);
    // Falls through to rate limiting / security headers — not 204
    expect(res.status).not.toBe(204);
  });
});

describe('Proxy Pipeline: Rate Limiting 429 Response', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '');
    mockRateLimitFn.mockImplementation(() => async () => mockRateLimitResult);
    mockGetRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' });
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockRateLimitResult = {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
    };

    // Mock rateLimit to throw a 429 error (matching middleware's error handling)
    const { rateLimit } = await import('@/lib/rate-limit');
    (rateLimit as any).mockImplementation(() => async () => {
      const error = new Error('Too many requests');
      (error as any).statusCode = 429;
      throw error;
    });

    const req = mockRequest('http://localhost:3000/api/employees');
    const res = await proxy(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many requests');
  });

  it('returns 500 for unexpected rate limit errors', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    (rateLimit as any).mockImplementation(() => async () => {
      throw new Error('Redis connection failed');
    });

    const req = mockRequest('http://localhost:3000/api/employees');
    const res = await proxy(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});

describe('Proxy Pipeline: Security Headers — Full Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    mockRateLimitResult = { allowed: true, remaining: 99, resetTime: Date.now() + 60000 };
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '');
    mockRateLimitFn.mockImplementation(() => async () => mockRateLimitResult);
    mockGetRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' });
  });

  it('sets all 7 security headers on page routes', async () => {
    const req = mockRequest('http://localhost:3000/');
    const res = await proxy(req);
    expect(res.headers.get('X-DNS-Prefetch-Control')).toBe('on');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=63072000');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('sets all 7 security headers on API routes', async () => {
    const req = mockRequest('http://localhost:3000/api/employees');
    const res = await proxy(req);
    expect(res.headers.get('X-DNS-Prefetch-Control')).toBe('on');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=63072000');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('origin-when-cross-origin');
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  it('sets CSP header with nonce on all routes', async () => {
    const req = mockRequest('http://localhost:3000/');
    const res = await proxy(req);
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain('default-src');
    expect(csp).toContain('script-src');
    expect(csp).toContain("'unsafe-inline'");
  });

  it('injects nonce into x-nonce header for client-side use', async () => {
    const req = mockRequest('http://localhost:3000/');
    const res = await proxy(req);
    const nonce = res.headers.get('x-nonce');
    expect(nonce).toBeTruthy();
    // Nonce should be base64-encoded UUID
    expect(nonce!.length).toBeGreaterThan(20);
  });

  it('sets different nonces on consecutive requests', async () => {
    const req1 = mockRequest('http://localhost:3000/');
    const res1 = await proxy(req1);
    const nonce1 = res1.headers.get('x-nonce');

    const req2 = mockRequest('http://localhost:3000/');
    const res2 = await proxy(req2);
    const nonce2 = res2.headers.get('x-nonce');

    expect(nonce1).not.toBe(nonce2);
  });
});

describe('Proxy Pipeline: Rate Limit Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    mockRateLimitResult = { allowed: true, remaining: 99, resetTime: Date.now() + 60000 };
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '');
    mockRateLimitFn.mockImplementation(() => async () => mockRateLimitResult);
    mockGetRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Limit': '100', 'X-RateLimit-Remaining': '99' });
  });

  it('includes X-RateLimit-Limit and X-RateLimit-Remaining on API responses', async () => {
    const req = mockRequest('http://localhost:3000/api/employees');
    const res = await proxy(req);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('99');
  });

  it('does NOT include rate limit headers on non-API routes', async () => {
    const req = mockRequest('http://localhost:3000/');
    const res = await proxy(req);
    expect(res.headers.get('X-RateLimit-Limit')).toBeFalsy();
  });
});
