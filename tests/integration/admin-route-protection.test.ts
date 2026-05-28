/**
 * Integration tests: Admin Route Protection
 * ===========================================
 *
 * Verifies that ALL admin API routes properly return 401/403 for
 * non-admin sessions — both unauthenticated and non-admin roles.
 *
 * These tests mock the auth() dependency and test the route handlers
 * directly, covering every admin route's entry-point guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock auth()
// ---------------------------------------------------------------------------
let mockSession: Record<string, unknown> | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// ---------------------------------------------------------------------------
// Mock DB — prevents accidental writes during auth-gate tests
// ---------------------------------------------------------------------------
vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    booking: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    review: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    auditLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
  },
}));

// Mock non-critical deps
vi.mock('@/lib/sentry-server', () => ({ captureError: vi.fn(() => 'mocked error') }));
vi.mock('@/lib/audit-log', () => ({ auditLog: vi.fn(), AuditAction: {}, logAdminAction: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendRefundConfirmationEmail: vi.fn(), sendEmail: vi.fn() }));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------
// Admin routes
const { GET: GET_Users, PATCH: PATCH_Users } = await import('@/app/api/admin/users/route');
const { GET: GET_ReviewsList } = await import('@/app/api/admin/reviews/route');
const { PATCH: PATCH_Review, DELETE: DELETE_Review } = await import('@/app/api/admin/reviews/[id]/route');
const { GET: GET_Refunds, POST: POST_Refund } = await import('@/app/api/admin/refunds/route');
const { GET: GET_Analytics } = await import('@/app/api/admin/analytics/route');

// Older admin routes (refactored from hasRole → authorizeRoute)
const { GET: GET_Disputes } = await import('@/app/api/admin/disputes/route');
const { POST: POST_DisputeResolve } = await import('@/app/api/admin/disputes/resolve/route');
const { GET: GET_AuditLogs } = await import('@/app/api/admin/audit-logs/route');
const { GET: GET_Payouts } = await import('@/app/api/admin/payouts/route');
const { GET: GET_MentorApps } = await import('@/app/api/admin/mentor-applications/route');
const { PATCH: PATCH_MentorApp } = await import('@/app/api/admin/mentor-applications/[id]/route');

// Non-admin routes with auth
const { POST: POST_PayoutInitiate } = await import('@/app/api/payouts/initiate/route');
const { GET: GET_EmployeeMe } = await import('@/app/api/employee/me/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockRequest(method: string, url: string, body?: unknown): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000');
  return {
    method,
    url: urlObj.toString(),
    nextUrl: { searchParams: urlObj.searchParams, pathname: urlObj.pathname },
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as NextRequest;
}

async function expectUnauthenticated(handler: (req: NextRequest) => Promise<NextResponse> | Promise<NextResponse<unknown>>) {
  const req = mockRequest('GET', '/api/admin/test');
  const response = await handler(req);
  expect(response.status).toBe(401);
  const body = await response.json();
  expect(body.error).toContain('Unauthorized');
}

async function expectForbidden(handler: (req: NextRequest) => Promise<NextResponse> | Promise<NextResponse<unknown>>, role = 'STUDENT') {
  mockSession = { user: { id: 'non-admin-user', role } };
  const req = mockRequest('GET', '/api/admin/test');
  const response = await handler(req);
  expect(response.status).toBe(403);
  const body = await response.json();
  expect(body.error).toContain('Access denied');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Admin Route Protection — New Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  describe('/api/admin/users', () => {
    it('GET returns 401 when unauthenticated', async () => {
      await expectUnauthenticated(GET_Users);
    });

    it('GET returns 403 for non-admin role', async () => {
      await expectForbidden(GET_Users);
    });

    it('PATCH returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('PATCH', '/api/admin/users', { userId: 'x', action: 'ban' });
      const response = await PATCH_Users(req);
      expect(response.status).toBe(401);
    });

    it('PATCH returns 403 for STUDENT role', async () => {
      mockSession = { user: { id: 'student1', role: 'STUDENT' } };
      const req = mockRequest('PATCH', '/api/admin/users', { userId: 'x', action: 'ban' });
      const response = await PATCH_Users(req);
      expect(response.status).toBe(403);
    });
  });

  describe('/api/admin/reviews', () => {
    it('GET returns 401 when unauthenticated', async () => {
      await expectUnauthenticated(GET_ReviewsList);
    });

    it('GET returns 403 for EMPLOYEE role', async () => {
      await expectForbidden(GET_ReviewsList, 'EMPLOYEE');
    });
  });

  describe('/api/admin/reviews/[id]', () => {
    it('PATCH returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('PATCH', '/api/admin/reviews/abc', { action: 'approve' });
      const response = await PATCH_Review(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(response.status).toBe(401);
    });

    it('PATCH returns 403 for STUDENT', async () => {
      mockSession = { user: { id: 's1', role: 'STUDENT' } };
      const req = mockRequest('PATCH', '/api/admin/reviews/abc', { action: 'approve' });
      const response = await PATCH_Review(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(response.status).toBe(403);
    });

    it('DELETE returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('DELETE', '/api/admin/reviews/abc');
      const response = await DELETE_Review(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(response.status).toBe(401);
    });

    it('DELETE returns 403 for PARENT role', async () => {
      mockSession = { user: { id: 'p1', role: 'PARENT' } };
      const req = mockRequest('DELETE', '/api/admin/reviews/abc');
      const response = await DELETE_Review(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(response.status).toBe(403);
    });
  });

  describe('/api/admin/refunds', () => {
    it('GET returns 401 when unauthenticated', async () => {
      await expectUnauthenticated(GET_Refunds);
    });

    it('GET returns 403 for EMPLOYEE', async () => {
      await expectForbidden(GET_Refunds, 'EMPLOYEE');
    });

    it('POST returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('POST', '/api/admin/refunds', { bookingId: 'x' });
      const response = await POST_Refund(req);
      expect(response.status).toBe(401);
    });
  });

  describe('/api/admin/analytics', () => {
    it('GET returns 401 when unauthenticated', async () => {
      await expectUnauthenticated(GET_Analytics);
    });

    it('GET returns 403 for STUDENT role', async () => {
      await expectForbidden(GET_Analytics);
    });
  });
});

describe('Admin Route Protection — Older Routes (refactored to authorizeRoute)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  describe('/api/admin/disputes', () => {
    it('GET returns 401 when unauthenticated', async () => await expectUnauthenticated(GET_Disputes));
    it('GET returns 403 for STUDENT', async () => await expectForbidden(GET_Disputes));
  });

  describe('/api/admin/disputes/resolve', () => {
    it('POST returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('POST', '/api/admin/disputes/resolve', { bookingId: 'x', outcome: 'RESOLVED_PAY' });
      const response = await POST_DisputeResolve(req);
      expect(response.status).toBe(401);
    });
  });

  describe('/api/admin/audit-logs', () => {
    it('GET returns 401 when unauthenticated', async () => await expectUnauthenticated(GET_AuditLogs));
    it('GET returns 403 for EMPLOYEE', async () => await expectForbidden(GET_AuditLogs, 'EMPLOYEE'));
  });

  describe('/api/admin/payouts', () => {
    it('GET returns 401 when unauthenticated', async () => await expectUnauthenticated(GET_Payouts));
    it('GET returns 403 for PARENT', async () => await expectForbidden(GET_Payouts, 'PARENT'));
  });

  describe('/api/admin/mentor-applications', () => {
    it('GET returns 401 when unauthenticated', async () => await expectUnauthenticated(GET_MentorApps));
    it('GET returns 403 for STUDENT', async () => await expectForbidden(GET_MentorApps));
  });

  describe('/api/admin/mentor-applications/[id]', () => {
    it('PATCH returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('PATCH', '/api/admin/mentor-applications/abc', { action: 'APPROVE' });
      const response = await PATCH_MentorApp(req, { params: Promise.resolve({ id: 'abc' }) });
      expect(response.status).toBe(401);
    });
  });
});

describe('Non-admin routes with role protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  describe('/api/payouts/initiate', () => {
    it('POST returns 401 when unauthenticated', async () => {
      mockSession = null;
      const req = mockRequest('POST', '/api/payouts/initiate', { bookingId: 'x' });
      const response = await POST_PayoutInitiate(req);
      expect(response.status).toBe(401);
    });

    it('POST returns 403 for non-admin role', async () => {
      mockSession = { user: { id: 's1', role: 'STUDENT' } };
      const req = mockRequest('POST', '/api/payouts/initiate', { bookingId: 'x' });
      const response = await POST_PayoutInitiate(req);
      expect(response.status).toBe(403);
    });
  });

  describe('/api/employee/me', () => {
    it('GET returns 401 when unauthenticated', async () => {
      const req = mockRequest('GET', '/api/employee/me');
      const response = await GET_EmployeeMe(req);
      expect(response.status).toBe(401);
    });

    it('GET returns 403 for non-EMPLOYEE role', async () => {
      mockSession = { user: { id: 's1', role: 'STUDENT' } };
      const req = mockRequest('GET', '/api/employee/me');
      const response = await GET_EmployeeMe(req);
      expect(response.status).toBe(403);
    });
  });
});
