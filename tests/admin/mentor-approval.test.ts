import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock prisma
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    mentorApplication: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      findMany: (...args: any[]) => mockFindMany(...args),
      update: (...args: any[]) => mockUpdate(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
    mentorProfile: { create: jest.fn() },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('@/lib/admin-logger', () => ({
  logAdminAction: jest.fn(),
}));

const mockAuth = require('@/lib/auth').auth;
const mockSendEmail = require('@/lib/email').sendEmail;
const mockLogAdminAction = require('@/lib/admin-logger').logAdminAction;

const ADMIN_SESSION = { user: { id: 'admin-1', role: 'ADMIN' } };
const NON_ADMIN_SESSION = { user: { id: 'user-1', role: 'STUDENT' } };

function mockRequest(body?: any): NextRequest {
  return {
    json: () => Promise.resolve(body || {}),
    headers: new Map(),
  } as any;
}

function mockParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('Admin Mentor Approval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should approve mentor application and set status to APPROVED', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockFindUnique.mockResolvedValue({
      id: 'app-1',
      userId: 'mentor-1',
      upiId: 'mentor@upi',
      bankAccountNumber: null,
      bankIFSC: null,
      status: 'PENDING_ADMIN_REVIEW',
      user: { email: 'mentor@test.com' },
    });
    mockTransaction.mockResolvedValue([{ status: 'APPROVED' }, { id: 'profile-1' }]);

    const { PATCH } = await import('@/app/api/admin/mentor-applications/[id]/route');

    const response = await PATCH(
      mockRequest({ action: 'APPROVE' }),
      mockParams('app-1')
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('APPROVED');
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'mentor@test.com', subject: expect.stringContaining('Approved') })
    );
  });

  it('should reject mentor application with reason', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockFindUnique.mockResolvedValue({
      id: 'app-1',
      userId: 'mentor-1',
      status: 'PENDING_ADMIN_REVIEW',
      user: { email: 'mentor@test.com' },
    });
    mockUpdate.mockResolvedValue({ status: 'REJECTED', rejectionReason: 'Insufficient experience' });

    const { PATCH } = await import('@/app/api/admin/mentor-applications/[id]/route');

    const response = await PATCH(
      mockRequest({ action: 'REJECT', rejectionReason: 'Insufficient experience in the field. Please gain more experience and re-apply.' }),
      mockParams('app-1')
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe('REJECTED');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'mentor@test.com', subject: expect.stringContaining('Status') })
    );
  });

  it('should return 403 for non-admin user', async () => {
    mockAuth.mockResolvedValue(NON_ADMIN_SESSION);

    const { PATCH } = await import('@/app/api/admin/mentor-applications/[id]/route');

    const response = await PATCH(
      mockRequest({ action: 'APPROVE' }),
      mockParams('app-1')
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBeDefined();
  });

  it('should return 404 for non-existent application', async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    mockFindUnique.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/admin/mentor-applications/[id]/route');

    const response = await PATCH(
      mockRequest({ action: 'APPROVE' }),
      mockParams('nonexistent')
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe('Application not found');
  });
});
