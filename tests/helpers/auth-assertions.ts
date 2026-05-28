/**
 * Auth Assertion Helpers
 * =======================
 *
 * Reusable test helpers for verifying admin route protection.
 * Use these in integration tests to reduce boilerplate.
 *
 * Usage:
 *   import { assertRequiresAdmin } from '@/tests/helpers/auth-assertions';
 *   import { GET } from '@/app/api/admin/users/route';
 *
 *   describe('GET /api/admin/users', () => {
 *     it('protects the route', () => assertRequiresAdmin(GET));
 *   });
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouteHandler = (req: NextRequest, ...args: unknown[]) => Promise<NextResponse<unknown>>;

type SessionOverride = {
  user?: { id?: string; role?: string };
} | null;

// ---------------------------------------------------------------------------
// Globals — must be shared via vi.mock in the importing test file
// ---------------------------------------------------------------------------

// These must be set up in the test file before using assertRequiresAdmin:
//
//   import { vi, beforeEach } from 'vitest';
//   let mockSession: Record<string, unknown> | null = null;
//   vi.mock('@/lib/auth', () => ({ auth: vi.fn(() => Promise.resolve(mockSession)) }));
//   vi.mock('@/lib/db', () => ({ prisma: { ... } }));
//

export {};

/**
 * Set mockSession for auth() in the test file.
 * This is a no-op helper — the actual mock must be set up in the test file.
 * Use it as documentation of intent:
 *
 *   beforeEach(() => { setMockSession(null); });
 */
export function setMockSession(session: SessionOverride): void {
  // This is a no-op helper; the actual mockSession variable must be
  // set up in the importing test file using vi.mock.
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function mockRequest(method: string, url: string, body?: unknown): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000');
  return {
    method,
    url: urlObj.toString(),
    nextUrl: { searchParams: urlObj.searchParams, pathname: urlObj.pathname } as URL,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Assertion: assertRequiresAdmin
// ---------------------------------------------------------------------------

/**
 * Assert that a route handler:
 * 1. Returns 401 when unauthenticated
 * 2. Returns 403 when authenticated as a non-admin role
 * 3. Returns 200 (or non-error) when authenticated as ADMIN
 *
 * @param handler  - The route handler function (GET, POST, PATCH, etc.)
 * @param mockSessionRef - Reference to the mockSession variable in the test file
 * @param args     - Additional arguments to pass to the handler (e.g. params)
 * @param method   - HTTP method for the mock request
 * @param body     - Request body for POST/PATCH/PUT
 */
export async function assertRequiresAdmin(
  handler: RouteHandler,
  mockSessionRef: { value: SessionOverride },
  options?: {
    method?: string;
    body?: unknown;
    url?: string;
    args?: unknown[];
  }
): Promise<void> {
  const { method = 'GET', body, url = '/api/admin/test', args = [] } = options ?? {};

  // Test 1: Unauthenticated → 401
  mockSessionRef.value = null;
  const unauthReq = mockRequest(method, url, body);
  const unauthRes = await handler(unauthReq, ...args);
  expect(unauthRes.status).toBe(401);

  // Test 2: Non-admin role → 403
  mockSessionRef.value = { user: { id: 'student-1', role: 'STUDENT' } };
  const forbiddenReq = mockRequest(method, url, body);
  const forbiddenRes = await handler(forbiddenReq, ...args);
  expect(forbiddenRes.status).toBe(403);

  // Test 3: Admin role → not 401/403
  mockSessionRef.value = { user: { id: 'admin-1', role: 'ADMIN' } };
  const adminReq = mockRequest(method, url, body);
  const adminRes = await handler(adminReq, ...args);
  expect(adminRes.status).not.toBe(401);
  expect(adminRes.status).not.toBe(403);
}

/**
 * Assert that a route handler returns the expected error responses
 * for unauthenticated and wrong-role scenarios.
 * Does NOT test the admin-success path.
 *
 * Use this when the admin-success path requires complex DB mocking.
 */
export async function assertRequiresAdminSimple(
  handler: RouteHandler,
  mockSessionRef: { value: SessionOverride },
  options?: {
    method?: string;
    body?: unknown;
    url?: string;
    args?: unknown[];
  }
): Promise<void> {
  const { method = 'GET', body, url = '/api/admin/test', args = [] } = options ?? {};

  // Test 1: Unauthenticated → 401
  mockSessionRef.value = null;
  const unauthRes = await handler(mockRequest(method, url, body), ...args);
  expect(unauthRes.status).toBe(401);

  // Test 2: Non-admin role → 403
  mockSessionRef.value = { user: { id: 'student-1', role: 'STUDENT' } };
  const forbiddenRes = await handler(mockRequest(method, url, body), ...args);
  expect(forbiddenRes.status).toBe(403);
}

// ---------------------------------------------------------------------------
// Assertion: assertRequiresRole
// ---------------------------------------------------------------------------

/**
 * Assert that a route handler returns 401/403 for sessions lacking the required role.
 * @param allowedRoles - The roles that ARE allowed (e.g. ['EMPLOYEE'])
 * @param testRole     - A role that should be rejected (e.g. 'STUDENT')
 */
export async function assertRequiresRole(
  handler: RouteHandler,
  allowedRoles: string[],
  mockSessionRef: { value: SessionOverride },
  options?: {
    method?: string;
    body?: unknown;
    url?: string;
    args?: unknown[];
    testRole?: string;
  }
): Promise<void> {
  const { method = 'GET', body, url = '/api/admin/test', args = [], testRole = 'STUDENT' } = options ?? {};

  // Test 1: Unauthenticated → 401
  mockSessionRef.value = null;
  const unauthRes = await handler(mockRequest(method, url, body), ...args);
  expect(unauthRes.status).toBe(401);

  // Test 2: Wrong role → 403
  mockSessionRef.value = { user: { id: 'user-1', role: testRole } };
  const forbiddenRes = await handler(mockRequest(method, url, body), ...args);
  expect(forbiddenRes.status).toBe(403);
}
