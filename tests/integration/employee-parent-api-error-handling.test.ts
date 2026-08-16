/**
 * Integration tests: Employee & Parent API Error Handling
 * =======================================================
 *
 * Mirrors the error-handling coverage already written for the student
 * profile API (tests/integration/student-profile-api.test.ts).
 *
 * Covers:
 *   - GET /api/employee/me — 500 when prisma throws, 500 on non-Error throw
 *   - GET /api/dashboard/parent — 500 when prisma throws, 500 on non-Error throw
 *
 * Both routes already have try/catch blocks; these tests verify the
 * structured 500 response is actually produced instead of an unhandled exception.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock auth()
// ---------------------------------------------------------------------------
let mockSession: Record<string, unknown> | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// ---------------------------------------------------------------------------
// Mock auth-utils (used by employee/me route)
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth-utils', () => ({
  authorizeRoute: vi.fn((session: any, _roles: string[]) => {
    if (!session?.user?.id) {
      return { status: 401, json: async () => ({ error: 'Unauthorized' }) };
    }
    return null; // authorized
  }),
}));

// ---------------------------------------------------------------------------
// Mock DB — shared mocks for both routes
// ---------------------------------------------------------------------------
const mockEmployeeProfileFindUnique = vi.fn();
const mockReviewFindMany = vi.fn();
const mockBookingCount = vi.fn();
const mockParentProfileFindUnique = vi.fn();
const mockPromiseAll = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    employeeProfile: {
      findUnique: mockEmployeeProfileFindUnique,
    },
    review: {
      findMany: mockReviewFindMany,
    },
    parentProfile: {
      findUnique: mockParentProfileFindUnique,
    },
    // For dashboard/parent route which uses Promise.all with 9 queries:
    // We mock the top-level prisma methods that appear in the transaction.
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    conversation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    booking: {
      count: mockBookingCount,
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amountPaid: 0 } }),
    },
  },
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------
const { GET: GET_EmployeeMe } = await import('@/app/api/employee/me/route');
const { GET: GET_ParentDashboard } = await import('@/app/api/dashboard/parent/route');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockGetRequest(path: string): NextRequest {
  return {
    method: 'GET',
    url: `http://localhost:3000${path}`,
    nextUrl: new URL(`http://localhost:3000${path}`),
    headers: new Headers(),
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Tests: GET /api/employee/me
// ---------------------------------------------------------------------------
describe('GET /api/employee/me — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockEmployeeProfileFindUnique.mockReset();
    mockReviewFindMany.mockReset();
    mockBookingCount.mockReset();
  });

  it('returns 500 when prisma.employeeProfile.findUnique throws', async () => {
    mockSession = { user: { id: 'emp-1', role: 'EMPLOYEE' } };
    mockEmployeeProfileFindUnique.mockRejectedValue(new Error('Connection pool exhausted'));

    const req = mockGetRequest('/api/employee/me');
    const response = await GET_EmployeeMe(req);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toContain('Connection pool exhausted');
  });

  it('returns 500 when prisma throws a non-Error object', async () => {
    mockSession = { user: { id: 'emp-1', role: 'EMPLOYEE' } };
    mockEmployeeProfileFindUnique.mockRejectedValue('string error');

    const req = mockGetRequest('/api/employee/me');
    const response = await GET_EmployeeMe(req);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns 500 when prisma.review.findMany throws (post-profile query)', async () => {
    mockSession = { user: { id: 'emp-1', role: 'EMPLOYEE' } };
    mockEmployeeProfileFindUnique.mockResolvedValue({
      id: 'ep-1',
      userId: 'emp-1',
      totalCalls: 5,
      totalEarned: 10000,
      company: 'Google',
      jobTitle: 'SWE',
    });
    mockReviewFindMany.mockRejectedValue(new Error('Review query failed'));

    const req = mockGetRequest('/api/employee/me');
    const response = await GET_EmployeeMe(req);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toContain('Review query failed');
  });
});

// ---------------------------------------------------------------------------
// Tests: GET /api/dashboard/parent
// ---------------------------------------------------------------------------
describe('GET /api/dashboard/parent — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
    mockParentProfileFindUnique.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    mockSession = null;
    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('returns 403 for non-PARENT role (STUDENT)', async () => {
    mockSession = { user: { id: 'student-1', role: 'STUDENT' } };
    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Access denied');
  });

  it('returns 403 for non-PARENT role (EMPLOYEE)', async () => {
    mockSession = { user: { id: 'emp-1', role: 'EMPLOYEE' } };
    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('Access denied');
  });

  it('returns 500 when prisma throws', async () => {
    mockSession = { user: { id: 'parent-1', role: 'PARENT' } };
    mockParentProfileFindUnique.mockRejectedValue(new Error('DB timeout'));

    // The parent route uses Promise.all with multiple prisma calls.
    // We need to make sure the error propagates. Since the parent route
    // wraps everything in try/catch, any prisma error should produce 500.
    // However, the route uses Promise.all — we need to mock the specific
    // call that throws. Let's mock at the prisma level.
    const { prisma } = await import('@/lib/db');
    // Force parentProfile.findUnique to throw
    (prisma.parentProfile.findUnique as any).mockRejectedValue(new Error('DB timeout'));

    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toContain('DB timeout');
  });

  it('returns 500 when prisma throws a non-Error object', async () => {
    mockSession = { user: { id: 'parent-1', role: 'PARENT' } };
    const { prisma } = await import('@/lib/db');
    (prisma.parentProfile.findUnique as any).mockRejectedValue({ code: 'P2002' });

    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns profile data when parent has a profile', async () => {
    mockSession = { user: { id: 'parent-1', role: 'PARENT' } };
    const { prisma } = await import('@/lib/db');
    (prisma.parentProfile.findUnique as any).mockResolvedValue({
      fullName: 'Test Parent',
      city: 'Mumbai',
      childStage: 'College',
      childCourse: 'B.Tech',
      concerns: ['Career confusion'],
      openToConnect: true,
    });

    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.profile).toBeDefined();
    expect(body.data.profile.fullName).toBe('Test Parent');
  });

  it('returns default profile when parent has no profile row', async () => {
    mockSession = { user: { id: 'parent-1', role: 'PARENT', name: 'No Profile Parent' } };
    const { prisma } = await import('@/lib/db');
    (prisma.parentProfile.findUnique as any).mockResolvedValue(null);

    const req = mockGetRequest('/api/dashboard/parent');
    const response = await GET_ParentDashboard(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    // The route returns a default profile object when parentProfile is null
    expect(body.data.profile).toBeDefined();
    expect(body.data.profile.fullName).toBe('No Profile Parent');
  });
});
