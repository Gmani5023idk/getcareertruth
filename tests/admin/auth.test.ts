import { NextRequest, NextResponse } from 'next/server';

// Test the admin route handlers by checking that they return 401 for non-admin roles

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    booking: { count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    employeeProfile: { count: jest.fn() },
    adminLog: { findMany: jest.fn(), count: jest.fn() },
    mentorApplication: { findMany: jest.fn() },
  },
}));
jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/admin-logger', () => ({ logAdminAction: jest.fn() }));

const mockAuth = require('@/lib/auth').auth;

function mockReq(): NextRequest {
  return { json: () => Promise.resolve({}), headers: new Map(), url: 'http://localhost:3000/api/admin/stats' } as any;
}

const ADMIN_SESSION = { user: { id: 'admin-1', role: 'ADMIN' } };
const STUDENT_SESSION = { user: { id: 'student-1', role: 'STUDENT' } };
const EMPLOYEE_SESSION = { user: { id: 'employee-1', role: 'EMPLOYEE' } };

describe('Admin Auth Guard', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Stats API', () => {
    it('should return 200 for ADMIN role', async () => {
      mockAuth.mockResolvedValue(ADMIN_SESSION);
      // Mock all the DB calls to return empty/safe values
      const mockDb = require('@/lib/db').prisma;
      mockDb.user.count.mockResolvedValue(0);
      mockDb.booking.count.mockResolvedValue(0);
      mockDb.booking.aggregate.mockResolvedValue({ _sum: { amountPaid: 0, employeePayout: 0 } });
      mockDb.employeeProfile.count.mockResolvedValue(0);
      mockDb.adminLog.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/admin/stats/route');
      const res = await GET();
      expect(res.status).toBe(200);
    });

    it('should return 401 for STUDENT role', async () => {
      mockAuth.mockResolvedValue(STUDENT_SESSION);

      const { GET } = await import('@/app/api/admin/stats/route');
      const res = await GET();
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('should return 401 for EMPLOYEE role', async () => {
      mockAuth.mockResolvedValue(EMPLOYEE_SESSION);

      const { GET } = await import('@/app/api/admin/stats/route');
      const res = await GET();
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('should return 401 for unauthenticated request', async () => {
      mockAuth.mockResolvedValue(null);

      const { GET } = await import('@/app/api/admin/stats/route');
      const res = await GET();
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });
  });

  describe('Charts API', () => {
    it('should return 401 for STUDENT role', async () => {
      mockAuth.mockResolvedValue(STUDENT_SESSION);

      const { GET } = await import('@/app/api/admin/charts/route');
      const req = { url: 'http://localhost:3000/api/admin/charts?period=30d' } as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Users API', () => {
    it('should return 401 for STUDENT role', async () => {
      mockAuth.mockResolvedValue(STUDENT_SESSION);

      const { GET } = await import('@/app/api/admin/users/route');
      const req = { url: 'http://localhost:3000/api/admin/users' } as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Audit Log API', () => {
    it('should return 401 for STUDENT role', async () => {
      mockAuth.mockResolvedValue(STUDENT_SESSION);

      const { GET } = await import('@/app/api/admin/audit-log/route');
      const req = { url: 'http://localhost:3000/api/admin/audit-log' } as NextRequest;
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });
});
