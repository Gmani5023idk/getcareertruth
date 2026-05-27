import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/bookings/[id]/cancel/route';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { createRazorpayRefund } from '@/lib/razorpay';

jest.mock('@/lib/db', () => ({
  prisma: {
    booking: {
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

describe('Refund Eligibility Logic', () => {
  const mockDateNow = jest.spyOn(Date, 'now');
  const fixedNow = new Date('2026-06-01T12:00:00Z').getTime();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(fixedNow);
    (auth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
    (createRazorpayRefund as jest.Mock).mockResolvedValue({ id: 'rfnd_123', status: 'processed' });
    (prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'booking-1' });
  });

  afterAll(() => {
    mockDateNow.mockRestore();
  });

  const runCancel = async (scheduledAt: Date, status = 'CONFIRMED') => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'booking-1',
      studentId: 'user-1',
      employeeId: 'emp-1',
      scheduledAt,
      status,
      razorpayPaymentId: 'pay_123',
      amountPaid: 100000,
    });

    const req = new NextRequest('http://localhost/api/bookings/booking-1/cancel', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'test' }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'booking-1' }) });
    return res.json();
  };

  it('Exactly 24h away → eligible', async () => {
    const scheduledAt = new Date(fixedNow + 24 * 60 * 60 * 1000);
    const data = await runCancel(scheduledAt);
    expect(data.refundStatus).toBe('PROCESSING');
    expect(createRazorpayRefund).toHaveBeenCalled();
  });

  it('24h + 1 minute → eligible', async () => {
    const scheduledAt = new Date(fixedNow + 24 * 60 * 60 * 1000 + 60000);
    const data = await runCancel(scheduledAt);
    expect(data.refundStatus).toBe('PROCESSING');
    expect(createRazorpayRefund).toHaveBeenCalled();
  });

  it('24h - 1 minute → NOT eligible', async () => {
    const scheduledAt = new Date(fixedNow + 24 * 60 * 60 * 1000 - 60000);
    const data = await runCancel(scheduledAt);
    expect(data.refundStatus).toBe('NOT_ELIGIBLE');
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('0 minutes away → NOT eligible', async () => {
    const scheduledAt = new Date(fixedNow);
    const data = await runCancel(scheduledAt);
    expect(data.refundStatus).toBe('NOT_ELIGIBLE');
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });

  it('Past session → NOT eligible', async () => {
    const scheduledAt = new Date(fixedNow - 60000); // 1 minute ago
    const data = await runCancel(scheduledAt);
    expect(data.refundStatus).toBe('NOT_ELIGIBLE');
    expect(createRazorpayRefund).not.toHaveBeenCalled();
  });
});
