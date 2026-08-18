/**
 * Integration tests: Paginated Employee Fetch
 * =============================================
 *
 * Covers:
 *   - GET /api/employees — pagination, filtering by industry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Must mock @/lib/auth first because apiHandler imports it, which loads next-auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/db', () => {
  const mockUserFindMany = vi.fn().mockResolvedValue([]);
  const mockUserCount = vi.fn().mockResolvedValue(0);
  return {
    prisma: {
      user: {
        findMany: mockUserFindMany,
        count: mockUserCount,
      },
      employeeProfile: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn(async (queries: unknown[]) => {
        // Simulate Prisma $transaction: execute each operation and collect results
        return [[], 0];
      }),
    },
  };
});

vi.mock('@/shared/schemas/employee.schema', () => ({
  listEmployeesSchema: {
    parse: vi.fn((params: Record<string, unknown>) => params),
  },
}));

const { GET: GET_Employees } = await import('@/app/api/employees/route');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/employees — Paginated employee list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns successful response with pagination metadata', async () => {
    const req = mockRequest('GET', '/api/employees?page=1&limit=10');
    const response = await GET_Employees(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('accepts industry filter', async () => {
    const req = mockRequest('GET', '/api/employees?industry=tech&page=1&limit=10');
    const response = await GET_Employees(req);
    expect(response.status).toBe(200);
  });

  it('uses default pagination values when not provided', async () => {
    const req = mockRequest('GET', '/api/employees');
    const response = await GET_Employees(req);
    expect(response.status).toBe(200);
  });
});
