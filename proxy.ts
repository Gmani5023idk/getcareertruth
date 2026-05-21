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

const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // 1. Protect Dashboard Routes
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

  // 2. Protect Auth Routes (Redirect authenticated users appropriately)
  if (pathname.startsWith('/login') || pathname.startsWith('/get-started')) {
    if (token) {
      // If user has a role, redirect to their dashboard
      if (token.role) {
        console.log('Proxy: Redirecting authenticated user with role to dashboard');
        return NextResponse.redirect(new URL(`/dashboard/${(token.role as string).toLowerCase()}`, request.url));
      }
      // If user doesn't have a role (new user), redirect to onboarding
      else {
        console.log('Proxy: Redirecting new user to onboarding');
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    }
  }

  // 3. CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '';

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
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

  // 4. Rate Limiting for API routes
  if (pathname.startsWith('/api/')) {
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
    } catch (error: any) {
      if (error.statusCode === 429) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

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
