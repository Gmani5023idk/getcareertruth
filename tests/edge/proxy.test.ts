/**
 * Edge Middleware Tests: proxy.ts
 * ================================
 *
 * Tests for the Next.js proxy (middleware) layer that enforces:
 * - Admin route auth (401 → login, 403 for non-admin)
 * - CSRF origin/referer validation
 * - Razorpay webhook CSRF exemption
 * - HTTPS redirect (production)
 * - IP allowlist for admin routes
 * - Dashboard route protection
 * - Auth route redirection
 *
 * These tests mock next-auth/jwt and @/lib/rate-limit to avoid
 * real authentication and rate limiting dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

let mockToken: Record<string, unknown> | null = null;

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(() => Promise.resolve(mockToken)),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => (req: unknown) => ({ success: true })),
  RATE_LIMIT_CONFIGS: {
    auth: { limit: 5, window: 900 },
    chat: { limit: 30, window: 60 },
    payment: { limit: 10, window: 60 },
    api: { limit: 100, window: 60 },
  },
  getRateLimitHeaders: vi.fn(() => ({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
  })),
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

  // Create headers with lowercase key normalization (real Headers API is case-insensitive)
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

describe('Edge Middleware: Admin Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    // Ensure production checks pass in test env by overriding NODE_ENV locally
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
    vi.stubEnv('ADMIN_ALLOWED_IPS', '');
  });

  describe('Unauthenticated access', () => {
    it('should redirect unauthenticated /admin page to login', async () => {
      const req = mockRequest('http://localhost:3000/admin');
      const res = await proxy(req);
      expect(res.status).toBe(307); // redirect
      const location = res.headers.get('Location') || '';
      expect(location).toContain('/login');
    });

    it('should return 401 for unauthenticated /api/admin/users', async () => {
      const req = mockRequest('http://localhost:3000/api/admin/users');
      const res = await proxy(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('Non-admin authenticated access', () => {
    it('should return 403 for non-admin on /api/admin/* routes', async () => {
      mockToken = { sub: 'user-1', role: 'STUDENT' };
      const req = mockRequest('http://localhost:3000/api/admin/users');
      const res = await proxy(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden');
    });

    it('should redirect non-admin to / for /admin page routes', async () => {
      mockToken = { sub: 'user-1', role: 'STUDENT' };
      const req = mockRequest('http://localhost:3000/admin');
      const res = await proxy(req);
      expect(res.status).toBe(307); // redirect
      const location = res.headers.get('Location') || '';
      expect(location).toBe('http://localhost:3000/');
    });
  });

  describe('Admin authenticated access', () => {
    it('should allow ADMIN role to pass through /api/admin/*', async () => {
      mockToken = { sub: 'admin-1', role: 'ADMIN' };
      const req = mockRequest('http://localhost:3000/api/admin/users');
      const res = await proxy(req);
      // Should not return 401, 403, or redirect — should pass to handler
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(307);
    });

    it('should allow ADMIN role to pass through /admin pages', async () => {
      mockToken = { sub: 'admin-1', role: 'ADMIN' };
      const req = mockRequest('http://localhost:3000/admin/disputes');
      const res = await proxy(req);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(307);
    });
  });

  describe('IP allowlist', () => {
    it('should block admin API routes for non-allowlisted IPs', async () => {
      vi.stubEnv('ADMIN_ALLOWED_IPS', '203.0.113.1,198.51.100.1');
      mockToken = { sub: 'admin-1', role: 'ADMIN' };
      const req = mockRequest('http://localhost:3000/api/admin/users', {
        headers: { 'x-forwarded-for': '192.0.2.1' },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
    });

    it('should allow admin API routes for allowlisted IPs', async () => {
      vi.stubEnv('ADMIN_ALLOWED_IPS', '203.0.113.1,198.51.100.1');
      mockToken = { sub: 'admin-1', role: 'ADMIN' };
      const req = mockRequest('http://localhost:3000/api/admin/users', {
        headers: { 'x-forwarded-for': '203.0.113.1' },
      });
      const res = await proxy(req);
      expect(res.status).not.toBe(403);
    });
  });
});

describe('Edge Middleware: CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  });

  it('should block POST to /api/payments/refund with foreign Origin', async () => {
    const req = mockRequest('http://localhost:3000/api/payments/refund', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'test' }),
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('should allow POST to /api/payments/refund with localhost Origin', async () => {
    const req = mockRequest('http://localhost:3000/api/payments/refund', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'test' }),
    });
    const res = await proxy(req);
    // CSRF passes — may be blocked by handler auth, but edge should not block
    expect(res.status).not.toBe(403);
  });

  it('should allow POST to /api/payments/refund without Origin header (server-to-server)', async () => {
    const req = mockRequest('http://localhost:3000/api/payments/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'test' }),
    });
    const res = await proxy(req);
    // No Origin → bypass CSRF check
    expect(res.status).not.toBe(403);
  });

  it('should block POST with foreign Referer when Origin is absent', async () => {
    const req = mockRequest('http://localhost:3000/api/payments/refund', {
      method: 'POST',
      headers: {
        Referer: 'https://phishing.com/fake-page',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId: 'test' }),
    });
    const res = await proxy(req);
    expect(res.status).toBe(403);
  });

  it('should NOT block Razorpay webhook with foreign Origin (CSRF exemption)', async () => {
    // Razorpay may send Origin: https://api.razorpay.com — must be allowed through
    const req = mockRequest('http://localhost:3000/api/payments/webhook', {
      method: 'POST',
      headers: {
        Origin: 'https://api.razorpay.com',
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'test-signature',
      },
      body: JSON.stringify({ event: 'payment.captured', payload: {} }),
    });
    const res = await proxy(req);
    // Should NOT be blocked by CSRF — webhook is exempt
    expect(res.status).not.toBe(403);
    // The handler would reject due to invalid signature, but edge should let it through
  });
});

describe('Edge Middleware: Dashboard Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  });

  it('should redirect unauthenticated user from /dashboard to login', async () => {
    mockToken = null;
    const req = mockRequest('http://localhost:3000/dashboard/student');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toContain('/login');
  });

  it('should allow authenticated user with role to access dashboard', async () => {
    mockToken = { sub: 'user-1', role: 'STUDENT' };
    const req = mockRequest('http://localhost:3000/dashboard/student');
    const res = await proxy(req);
    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(401);
  });

  it('should redirect user without role to onboarding', async () => {
    mockToken = { sub: 'user-1', role: null };
    const req = mockRequest('http://localhost:3000/dashboard/student');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toContain('/onboarding');
  });
});

describe('Edge Middleware: Auth Route Redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  });

  it('should redirect authenticated user from /login to their dashboard', async () => {
    mockToken = { sub: 'user-1', role: 'STUDENT' };
    const req = mockRequest('http://localhost:3000/login');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toContain('/dashboard/student');
  });

  it('should allow unauthenticated user on /login page', async () => {
    mockToken = null;
    const req = mockRequest('http://localhost:3000/login');
    const res = await proxy(req);
    expect(res.status).not.toBe(307);
  });
});

describe('Edge Middleware: HTTPS Redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  });

  it('should redirect HTTP to HTTPS in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = mockRequest('http://localhost:3000/admin');
    const res = await proxy(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toMatch(/^https:\/\//);
  });

  it('should NOT redirect HTTP to HTTPS in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const req = mockRequest('http://localhost:3000/admin');
    const res = await proxy(req);
    // Should not be an HTTPS redirect (but may be an admin auth redirect)
    const location = res.headers.get('Location') || '';
    expect(location.startsWith('https://')).toBe(false);
  });
});

describe('Edge Middleware: File Upload Size Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  });

  it('should reject uploads over 10MB with 413', async () => {
    const req = mockRequest('http://localhost:3000/api/auth/upload-id', {
      method: 'POST',
      headers: {
        'Content-Length': '10485761', // 10MB + 1 byte
        'Content-Type': 'application/octet-stream',
      },
    });
    const res = await proxy(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain('10MB');
  });

  it('should allow uploads under 10MB to pass through', async () => {
    const req = mockRequest('http://localhost:3000/api/auth/upload-id', {
      method: 'POST',
      headers: {
        'Content-Length': '5242880', // 5MB
        'Content-Type': 'application/octet-stream',
      },
    });
    const res = await proxy(req);
    // Should pass through edge (handler may reject based on file type/content, but edge okay)
    expect(res.status).not.toBe(413);
    expect(res.status).not.toBe(500);
  });

  it('should allow uploads without Content-Length header to pass through', async () => {
    const req = mockRequest('http://localhost:3000/api/auth/upload-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });
    const res = await proxy(req);
    // No Content-Length → edge skips size check, handler validates
    expect(res.status).not.toBe(413);
    expect(res.status).not.toBe(500);
  });

  it('should NOT apply size check to non-upload routes', async () => {
    const req = mockRequest('http://localhost:3000/api/employees', {
      method: 'POST',
      headers: {
        'Content-Length': '20971520', // 20MB (over limit but different route)
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });
    const res = await proxy(req);
    // Different route → no file size check; may be blocked by rate limit/CSRF but not 413
    expect(res.status).not.toBe(413);
  });
});

describe('Edge Middleware: Security Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
  });

  it('should set Strict-Transport-Security header on non-API pages', async () => {
    const req = mockRequest('http://localhost:3000/');
    const res = await proxy(req);
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=63072000');
  });

  it('should set security headers on API routes', async () => {
    const req = mockRequest('http://localhost:3000/api/employees');
    const res = await proxy(req);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });
});
