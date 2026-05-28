/**
 * Next.js Proxy (formerly Middleware)
 *
 * Applies rate limiting to all API routes and handles security headers.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { rateLimit, RATE_LIMIT_CONFIGS, getRateLimitHeaders } from '@/lib/rate-limit';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'https://getcareertruth.in',
  'https://www.getcareertruth.in',
];

// Optional IP allowlist for admin routes (comma-separated)
// NOTE: This is read at request time via getAdminAllowedIps() so tests
// can control it via vi.stubEnv before calling proxy().
function getAdminAllowedIps(): string[] {
  return (process.env.ADMIN_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
}

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

// Admin route prefixes (edge-level defense in depth — route handlers self-protect)
const ADMIN_PREFIXES = ['/admin', '/api/admin/'];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname, protocol } = request.nextUrl;
  const method = request.method;
  const isAdmin = isAdminRoute(pathname);
  const isApiRoute = pathname.startsWith('/api/');
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // ────────────────────────────────────────────────────────────────────────────
  // 0. HTTPS Enforcement (production only)
  // ────────────────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'production' && protocol === 'http:') {
    const httpsUrl = request.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 0a. File Upload Size Check (edge-level rejection for large payloads)
  // ────────────────────────────────────────────────────────────────────────────
  if (pathname === '/api/auth/upload-id') {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      // Reject at edge if Content-Length exceeds 10MB
      if (!isNaN(bytes) && bytes > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds maximum of 10MB' },
          { status: 413 }
        );
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Protect Dashboard Routes
  // ────────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      console.log('Proxy: Redirecting unauthenticated user from dashboard to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Redirect authenticated users without role to onboarding
    if (token && !token.role) {
      console.log('Proxy: Redirecting user without role to onboarding');
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Protect Auth Routes (Redirect authenticated users appropriately)
  // ────────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/login') || pathname.startsWith('/get-started')) {
    if (token) {
      // If user has a role, redirect to their dashboard
      if (token.role) {
        console.log('Proxy: Redirecting authenticated user with role to dashboard');
        return NextResponse.redirect(new URL(`/dashboard/${token.role.toLowerCase()}`, request.url));
      }
      // If user doesn't have a role (new user), redirect to onboarding
      else {
        console.log('Proxy: Redirecting new user to onboarding');
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Admin Route Enforcement (edge-level defense in depth)
  // ────────────────────────────────────────────────────────────────────────────
  if (isAdmin) {
    if (!token) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== 'ADMIN') {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    // IP allowlist (optional, admin only)
    const adminAllowedIps = getAdminAllowedIps();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')?.trim()
      || '127.0.0.1';
    if (adminAllowedIps.length > 0 && !adminAllowedIps.includes(clientIp)) {
      console.warn(`Admin access denied for IP: ${clientIp} on path: ${pathname}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. CSRF Protection for all API mutation endpoints
  // ────────────────────────────────────────────────────────────────────────────
  // NOTE: Payment webhooks are EXEMPT from CSRF — they authenticate via
  // Razorpay HMAC signature verification in the route handler. Razorpay
  // sends an Origin header from api.razorpay.com which would fail our
  // ALLOWED_ORIGINS check (only app domains are whitelisted).
  if (isApiRoute && MUTATION_METHODS.includes(method) && pathname !== '/api/payments/webhook') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Bypass if neither origin nor referer is sent (e.g., server-to-server/Vercel Cron)
    if (origin) {
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        try { return new URL(origin).origin === new URL(allowed).origin; }
        catch { return false; }
      });
      if (!isAllowed) {
        return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
      }
    } else if (referer) {
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        try { return new URL(referer).origin === new URL(allowed).origin; }
        catch { return false; }
      });
      if (!isAllowed) {
        return NextResponse.json({ error: 'Forbidden: invalid referer' }, { status: 403 });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. CORS headers for API routes
  // ────────────────────────────────────────────────────────────────────────────
  if (isApiRoute) {
    const origin = request.headers.get('origin') || '';

    // Handle preflight requests
    if (method === 'OPTIONS') {
      if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        return new NextResponse(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Rate Limiting for API routes + Security Headers
  // ────────────────────────────────────────────────────────────────────────────
  // Bypass rate limiting for cron routes with valid admin secret (Vercel Cron jobs)
  const isCronRoute = pathname.startsWith('/api/cron/');
  const cronAuthHeader = request.headers.get('x-admin-secret');
  const isAuthenticatedCron = isCronRoute && cronAuthHeader === process.env.ADMIN_SECRET;

  if (isApiRoute && !isAuthenticatedCron) {
    try {
      const origin = request.headers.get('origin') || '';
      const config = getRateLimitConfigForPath(pathname);
      const result = rateLimit(config)(request);
      const response = NextResponse.next();

      // Apply CORS headers for non-preflight API responses
      if (ALLOWED_ORIGINS.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      // Apply rate limit and security headers
      Object.entries(getRateLimitHeaders(result)).forEach(([key, value]) => response.headers.set(key, value));
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    } catch (error) {
      if ((error as Record<string, unknown>).statusCode === 429) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Security Headers for non-API routes (pages, static, etc.)
  // ────────────────────────────────────────────────────────────────────────────
  const response = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function getRateLimitConfigForPath(pathname: string) {
  if (pathname.startsWith('/api/auth/')) return RATE_LIMIT_CONFIGS.auth;
  if (pathname.startsWith('/api/chat/')) return RATE_LIMIT_CONFIGS.chat;
  if (pathname.startsWith('/api/payments/')) return RATE_LIMIT_CONFIGS.payment;
  return RATE_LIMIT_CONFIGS.api;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
