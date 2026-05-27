import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      update: (...args: any[]) => mockUpdate(...args),
    },
    booking: {
      findMany: (...args: any[]) => mockFindMany(...args),
      updateMany: (...args: any[]) => mockUpdateMany(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/admin-logger', () => ({ logAdminAction: jest.fn() }));

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

describe('Admin User Ban', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should ban user and set bannedAt + bannedReason', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
    mockFindMany.mockResolvedValue([]);
    mockTransaction.mockResolvedValue([]);

    const { POST } = await import('@/app/api/admin/users/[id]/ban/route');
    const res = await POST(mockReq({ reason: 'Violated platform terms of service repeatedly' }), mockP('user-1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockLogAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'BAN_USER' }));
  });

  it('should reject ban with too short reason', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue({ id: 'user-1' });

    const { POST } = await import('@/app/api/admin/users/[id]/ban/route');
    const res = await POST(mockReq({ reason: 'Spam' }), mockP('user-1'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Reason');
  });

  it('should suspend user and cancel bookings', async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockFindUnique.mockResolvedValue({ id: 'user-2', email: 'user2@test.com' });
    mockTransaction.mockResolvedValue([]);

    const { POST } = await import('@/app/api/admin/users/[id]/suspend/route');
    const res = await POST(mockReq({ reason: 'Inappropriate behavior', durationDays: 7 }), mockP('user-2'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.suspendedUntil).toBeDefined();
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockLogAdminAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'SUSPEND_USER' }));
  });

  it('should reject suspend without reason', async () => {
    mockAuth.mockResolvedValue(ADMIN);

    const { POST } = await import('@/app/api/admin/users/[id]/suspend/route');
    const res = await POST(mockReq({ durationDays: 7 }), mockP('user-1'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Reason');
  });

  it('should return 401 for non-admin user trying to ban', async () => {
    mockAuth.mockResolvedValue(NON_ADMIN);

    const { POST } = await import('@/app/api/admin/users/[id]/ban/route');
    const res = await POST(mockReq({ reason: 'Test reason for ban' }), mockP('user-1'));
    expect(res.status).toBe(401);
  });
});
