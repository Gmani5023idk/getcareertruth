/**
 * CSRF Protection Utility
 *
 * Provides CSRF protection for admin mutation endpoints (POST/PUT/PATCH/DELETE)
 * by verifying Origin and Referer headers match the application's domain.
 */

import { NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

/**
 * Validate that a request's Origin and Referer headers match allowed origins.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function validateCsrf(request: Request): null | Response {
  const method = request.method.toUpperCase();

  // Only check mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // If both Origin and Referer are missing, allow the request
  // (this can happen for server-side requests)
  if (!origin && !referer) {
    return null;
  }

  // Check Origin header if present
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const originUrl = new URL(origin);
        return originUrl.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'CSRF validation failed: invalid origin' },
        { status: 403 }
      );
    }
  }

  // Check Referer header if present and Origin is not present
  if (!origin && referer) {
    const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
      try {
        const allowedUrl = new URL(allowed);
        const refererUrl = new URL(referer);
        return refererUrl.origin === allowedUrl.origin;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'CSRF validation failed: invalid referer' },
        { status: 403 }
      );
    }
  }

  return null;
}
