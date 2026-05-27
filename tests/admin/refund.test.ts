import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    booking: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/admin-logger', () => ({ logAdminAction: jest.fn() }));
jest.mock('@/lib/admin-monitoring', () => ({ captureAdminError: jest.fn(), captureAdminAction: jest.fn() }));

// Mock razorpay to prevent real API calls
const mockRefund = jest.fn().mockResolvedValue({ id: 'rfnd_123' });
jest.mock('razorpay', () => jest.fn(() => ({
  payments: { refund: mockRefund },
})));

const mockAuth = require('@/lib/auth').auth;
const mockLogAdminAction = require('@/lib/admin-logger').logAdminAction;

const ADMIN = { user: { id: 'admin-1', role: 'ADMIN' } };
const NON_ADMIN = { user: { id: 'user-1', role: 'STUDENT' } };

function mockReq(body?: any): NextRequest {
  return { json: () => Promise.resolve(body || {}), headers: new Map() } as any;
}
function mockP(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('Admin Refund', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should refund a completed booking', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue({
      id: 'booking-1',
      amountPaid: 50000,
      status: 'COMPLETED',
      razorpayPaymentId: 'pay_123',
      student: { email: 'student@test.com' },
      employee: { email: 'mentor@test.com' },
    });
    mockUpdate.mockResolvedValue({ status: 'REFUNDED' });

    const { POST } = await import('@/app/api/admin/payments/[id]/refund/route');
    const res = await POST(mockReq({ reason: 'Student requested refund', amount: 50000 }), mockP('booking-1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockLogAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'ISSUE_REFUND' }));
  });

  it('should reject refund exceeding original amount', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue({
      id: 'booking-1',
      amountPaid: 50000,
      status: 'COMPLETED',
      student: { email: 'student@test.com' },
      employee: { email: 'mentor@test.com' },
    });

    const { POST } = await import('@/app/api/admin/payments/[id]/refund/route');
    const res = await POST(mockReq({ reason: 'Excessive refund', amount: 100000 }), mockP('booking-1'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('cannot exceed');
  });

  it('should reject refund for already refunded booking', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue({
      id: 'booking-1',
      amountPaid: 50000,
      status: 'REFUNDED',
      student: { email: 'student@test.com' },
      employee: { email: 'mentor@test.com' },
    });

    const { POST } = await import('@/app/api/admin/payments/[id]/refund/route');
    const res = await POST(mockReq({ reason: 'Double refund', amount: 50000 }), mockP('booking-1'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('already refunded');
  });

  it('should return 401 for non-admin', async () => {
    mockAuth.mockResolvedValue(NON_ADMIN);

    const { POST } = await import('@/app/api/admin/payments/[id]/refund/route');
    const res = await POST(mockReq({ reason: 'Test refund', amount: 100 }), mockP('booking-1'));
    expect(res.status).toBe(401);
  });
});
