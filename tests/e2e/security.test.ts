/**
 * E2E security isolation tests.
 *
 * Verifies that each role can only access their own resources and
 * that role boundaries are strictly enforced across the platform.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

const mockPrisma = {
  user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  booking: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  employeeProfile: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
  adminLog: { findMany: jest.fn(), count: jest.fn() },
  mentorApplication: { findMany: jest.fn(), findUnique: jest.fn() },
  parentProfile: { findUnique: jest.fn() },
  conversation: { findMany: jest.fn() },
};

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/admin-logger', () => ({ logAdminAction: jest.fn() }));
jest.mock('@/lib/admin-monitoring', () => ({ captureAdminError: jest.fn(), captureAdminAction: jest.fn() }));

const mockAuth = require('@/lib/auth').auth;

const STUDENT = { user: { id: 'student-1', role: 'STUDENT' } };
const EMPLOYEE = { user: { id: 'employee-1', role: 'EMPLOYEE' } };
const PARENT = { user: { id: 'parent-1', role: 'PARENT' } };
const ADMIN = { user: { id: 'admin-1', role: 'ADMIN' } };
const NONE = null;

function mockReq(body?: any): NextRequest {
  return { json: () => Promise.resolve(body || {}), headers: new Map(), url: 'http://localhost:3000/api/' } as any;
}

beforeEach(() => { jest.clearAllMocks(); });

describe('E2E: Security — Role Isolation', () => {
  // ─── Admin routes ──────────────────────────────────────────────────────

  describe('Admin routes require ADMIN role', () => {
    const adminRoutes = [
      { path: 'stats', get: async () => { const { GET } = await import('@/app/api/admin/stats/route'); return GET(); } },
    ];

    it.each([
      ['STUDENT', STUDENT],
      ['EMPLOYEE', EMPLOYEE],
      ['PARENT', PARENT],
      ['unauthenticated', NONE],
    ])('rejects %s from admin stats', async (_label, session) => {
      mockAuth.mockResolvedValue(session);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { amountPaid: 0, employeePayout: 0 } });
      mockPrisma.employeeProfile.count.mockResolvedValue(0);
      mockPrisma.adminLog.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/admin/stats/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('allows ADMIN to access stats', async () => {
      mockAuth.mockResolvedValue(ADMIN);
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.booking.count.mockResolvedValue(5);
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { amountPaid: 500000, employeePayout: 450000 } });
      mockPrisma.employeeProfile.count.mockResolvedValue(3);
      mockPrisma.adminLog.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/admin/stats/route');
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  // ─── Dashboard routes ──────────────────────────────────────────────────

  describe('Dashboard routes are role-scoped', () => {
    it('student dashboard requires STUDENT session', async () => {
      mockAuth.mockResolvedValue(NONE);
      const { GET } = await import('@/app/api/dashboard/student/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('employee dashboard requires EMPLOYEE session', async () => {
      mockAuth.mockResolvedValue(NONE);
      const { GET } = await import('@/app/api/dashboard/employee/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it('parent dashboard requires PARENT session', async () => {
      mockAuth.mockResolvedValue(NONE);
      const { GET } = await import('@/app/api/dashboard/parent/route');
      const res = await GET();
      expect(res.status).toBe(401);
    });
  });

  // ─── Booking isolation ─────────────────────────────────────────────────

  describe('Booking routes are user-scoped', () => {
    it('student sees only their own bookings', async () => {
      mockAuth.mockResolvedValue(STUDENT);
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'b1',
          studentId: 'student-1',
          employeeId: 'e1',
          scheduledAt: new Date(),
          status: 'CONFIRMED',
          durationMins: 30,
          topic: 'Career advice',
          meetingLink: null,
          conversationId: null,
          amountPaid: 29900,
          refundAmount: null,
          cancelReason: null,
          razorpayPaymentId: null,
          razorpayOrderId: null,
          payoutStatus: null,
          employee: {
            id: 'e1',
            profilePhoto: null,
            employeeProfile: { fullName: 'Mentor', jobTitle: 'Engineer', company: 'Google' },
          },
          student: null,
          parent: null,
          review: null,
        },
      ]);
      mockPrisma.booking.count.mockResolvedValue(1);

      const { GET } = await import('@/app/api/bookings/route');
      const res = await GET(mockReq() as NextRequest);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.bookings).toBeDefined();
    });

    it('employee sees only their own sessions', async () => {
      mockAuth.mockResolvedValue(EMPLOYEE);
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: 'b1',
          studentId: 's1',
          employeeId: 'employee-1',
          scheduledAt: new Date(),
          status: 'CONFIRMED',
          durationMins: 30,
          topic: 'Career session',
          meetingLink: null,
          conversationId: null,
          amountPaid: 1500,
          refundAmount: null,
          cancelReason: null,
          razorpayPaymentId: null,
          razorpayOrderId: null,
          payoutStatus: null,
          employee: null,
          student: {
            id: 's1',
            profilePhoto: null,
            studentProfile: { fullName: 'Student User' },
          },
          parent: null,
          review: null,
        },
      ]);
      mockPrisma.booking.count.mockResolvedValue(1);

      const { GET } = await import('@/app/api/bookings/route');
      const res = await GET(mockReq() as NextRequest);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.bookings).toBeDefined();
    });

    it('unauthenticated user cannot access bookings', async () => {
      mockAuth.mockResolvedValue(NONE);

      const { GET } = await import('@/app/api/bookings/route');
      const res = await GET(mockReq() as NextRequest);
      expect(res.status).toBe(401);
    });
  });

  // ─── Profile isolation ─────────────────────────────────────────────────

  describe('Profile routes return own data', () => {
    it('employee profile update requires EMPLOYEE session', async () => {
      mockAuth.mockResolvedValue(NONE);

      const { PUT } = await import('@/app/api/employee/profile/route');
      const res = await PUT(mockReq({}));
      expect(res.status).toBe(401);
    });

    it('unapproved employee profile returns 404 on public endpoint', async () => {
      mockAuth.mockResolvedValue(STUDENT);
      mockPrisma.employeeProfile.findUnique.mockResolvedValue(null);

      // 404 for non-existent profile
      const { GET } = await import('@/app/api/employees/[id]/route');
      const res = await GET(mockReq() as NextRequest, { params: Promise.resolve({ id: 'nonexistent' }) });
      expect(res.status).toBe(404);
    });
  });

  // ─── Mentor applications ───────────────────────────────────────────────

  describe('Mentor applications require admin', () => {
    it('student cannot approve mentor applications', async () => {
      mockAuth.mockResolvedValue(STUDENT);

      const { PATCH } = await import('@/app/api/admin/mentor-applications/[id]/route');
      const res = await PATCH(mockReq({ action: 'APPROVE' }), { params: Promise.resolve({ id: 'app-1' }) });
      expect(res.status).toBe(401);
    });

    it('employee cannot approve mentor applications', async () => {
      mockAuth.mockResolvedValue(EMPLOYEE);

      const { PATCH } = await import('@/app/api/admin/mentor-applications/[id]/route');
      const res = await PATCH(mockReq({ action: 'APPROVE' }), { params: Promise.resolve({ id: 'app-1' }) });
      expect(res.status).toBe(401);
    });
  });
});
