import { NextRequest } from 'next/server';
import { GET } from '@/app/api/bookings/route';
import { PUT } from '@/app/api/bookings/[id]/cancel/route';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createRazorpayRefund } from '@/lib/razorpay';

jest.mock('@/lib/db', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    financialAuditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/razorpay', () => ({
  createRazorpayRefund: jest.fn(),
}));

describe('Booking API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'student-1', role: 'STUDENT' } });
  });

  describe('GET /api/bookings', () => {
    it('Returns 401 if no session', async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/bookings');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('Student sees only their own bookings', async () => {
      const mockBooking = {
        id: 'b1',
        employee: { id: 'emp-1', profilePhoto: null, employeeProfile: { fullName: 'Mentor', jobTitle: 'SE', company: 'Co' } },
        student: { id: 'student-1', profilePhoto: null, studentProfile: { fullName: 'Student' } },
        parent: null,
        review: null,
        status: 'CONFIRMED',
        scheduledAt: new Date(),
        durationMins: 15,
        topic: 'Career advice',
        meetingLink: null,
        conversationId: null,
        amountPaid: 29900,
        refundAmount: null,
        cancelReason: null,
        razorpayPaymentId: null,
        razorpayOrderId: null,
        payoutStatus: 'PENDING',
      };
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking]);
      (prisma.booking.count as jest.Mock).mockResolvedValue(1);
      
      const req = new NextRequest('http://localhost/api/bookings');
      await GET(req);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: 'student-1',
          }),
        })
      );
    });

    it('Employee sees only their own sessions', async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: 'emp-1', role: 'EMPLOYEE' } });
      const mockBooking = {
        id: 'b1',
        employee: { id: 'emp-1', profilePhoto: null, employeeProfile: { fullName: 'Mentor', jobTitle: 'SE', company: 'Co' } },
        student: { id: 'student-1', profilePhoto: null, studentProfile: { fullName: 'Student' } },
        parent: null,
        review: null,
        status: 'CONFIRMED',
        scheduledAt: new Date(),
        durationMins: 15,
        topic: 'Career advice',
        meetingLink: null,
        conversationId: null,
        amountPaid: 29900,
        refundAmount: null,
        cancelReason: null,
        razorpayPaymentId: null,
        razorpayOrderId: null,
        payoutStatus: 'PENDING',
      };
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking]);
      
      const req = new NextRequest('http://localhost/api/bookings');
      await GET(req);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            employeeId: 'emp-1',
          }),
        })
      );
    });

    it('Status filter UPCOMING returns correct bookings', async () => {
      const mockBooking = {
        id: 'b1',
        employee: { id: 'emp-1', profilePhoto: null, employeeProfile: { fullName: 'Mentor', jobTitle: 'SE', company: 'Co' } },
        student: { id: 'student-1', profilePhoto: null, studentProfile: { fullName: 'Student' } },
        parent: null,
        review: null,
        status: 'CONFIRMED',
        scheduledAt: new Date(Date.now() + 86400000),
        durationMins: 15,
        topic: 'Career advice',
        meetingLink: null,
        conversationId: null,
        amountPaid: 29900,
        refundAmount: null,
        cancelReason: null,
        razorpayPaymentId: null,
        razorpayOrderId: null,
        payoutStatus: 'PENDING',
      };
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking]);
      
      const req = new NextRequest('http://localhost/api/bookings?tab=UPCOMING');
      await GET(req);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING_CONFIRM', 'CONFIRMED'] },
            scheduledAt: expect.any(Object),
          }),
        })
      );
    });

    it('Status filter PAST returns correct bookings', async () => {
      const mockBooking = {
        id: 'b1',
        employee: { id: 'emp-1', profilePhoto: null, employeeProfile: { fullName: 'Mentor', jobTitle: 'SE', company: 'Co' } },
        student: { id: 'student-1', profilePhoto: null, studentProfile: { fullName: 'Student' } },
        parent: null,
        review: null,
        status: 'COMPLETED',
        scheduledAt: new Date(Date.now() - 86400000),
        durationMins: 15,
        topic: 'Career advice',
        meetingLink: null,
        conversationId: null,
        amountPaid: 29900,
        refundAmount: null,
        cancelReason: null,
        razorpayPaymentId: null,
        razorpayOrderId: null,
        payoutStatus: 'PAID',
      };
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking]);
      
      const req = new NextRequest('http://localhost/api/bookings?tab=PAST');
      await GET(req);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ status: 'COMPLETED' }),
            ]),
          }),
        })
      );
    });

    it('Status filter CANCELLED returns correct bookings', async () => {
      const mockBooking = {
        id: 'b1',
        employee: { id: 'emp-1', profilePhoto: null, employeeProfile: { fullName: 'Mentor', jobTitle: 'SE', company: 'Co' } },
        student: { id: 'student-1', profilePhoto: null, studentProfile: { fullName: 'Student' } },
        parent: null,
        review: null,
        status: 'CANCELLED',
        scheduledAt: new Date(Date.now() - 86400000),
        durationMins: 15,
        topic: 'Career advice',
        meetingLink: null,
        conversationId: null,
        amountPaid: 29900,
        refundAmount: null,
        cancelReason: 'User cancelled',
        razorpayPaymentId: null,
        razorpayOrderId: null,
        payoutStatus: 'PENDING',
      };
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking]);
      
      const req = new NextRequest('http://localhost/api/bookings?tab=CANCELLED');
      await GET(req);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'CANCELLED',
          }),
        })
      );
    });

    it('Pagination works: page=1&limit=2 returns 2 of 5', async () => {
      const mockBooking = {
        id: 'b1',
        employee: { id: 'emp-1', profilePhoto: null, employeeProfile: { fullName: 'Mentor', jobTitle: 'SE', company: 'Co' } },
        student: { id: 'student-1', profilePhoto: null, studentProfile: { fullName: 'Student' } },
        parent: null,
        review: null,
        status: 'CONFIRMED',
        scheduledAt: new Date(),
        durationMins: 15,
        topic: 'Career advice',
        meetingLink: null,
        conversationId: null,
        amountPaid: 29900,
        refundAmount: null,
        cancelReason: null,
        razorpayPaymentId: null,
        razorpayOrderId: null,
        payoutStatus: 'PENDING',
      };
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([mockBooking, mockBooking]);
      
      const req = new NextRequest('http://localhost/api/bookings?page=1&limit=2');
      await GET(req);

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2,
          skip: 0,
        })
      );
    });
  });

  describe('POST /api/bookings/[id]/cancel', () => {
    // The prompt says POST, but the cancel route is actually PUT in the codebase
    // as seen in app/api/bookings/[id]/cancel/route.ts.
    // We will test the PUT function directly.

    it('Returns 401 if no session', async () => {
      (auth as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/bookings/b1/cancel', { method: 'PUT' });
      const res = await PUT(req, { params: Promise.resolve({ id: 'b1' }) });
      expect(res.status).toBe(401);
    });

    it('Returns 404 if booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/bookings/b1/cancel', { method: 'PUT' });
      const res = await PUT(req, { params: Promise.resolve({ id: 'b1' }) });
      expect(res.status).toBe(404);
    });

    it('Returns 403 if student cancels someone elses booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1', studentId: 'other-student', employeeId: 'emp-1'
      });
      const req = new NextRequest('http://localhost/api/bookings/b1/cancel', { method: 'PUT' });
      const res = await PUT(req, { params: Promise.resolve({ id: 'b1' }) });
      expect(res.status).toBe(403);
    });

    it('Returns 400 if booking already cancelled', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1', studentId: 'student-1', status: 'CANCELLED'
      });
      const req = new NextRequest('http://localhost/api/bookings/b1/cancel', { method: 'PUT' });
      const res = await PUT(req, { params: Promise.resolve({ id: 'b1' }) });
      expect(res.status).toBe(400);
    });
  });
});
