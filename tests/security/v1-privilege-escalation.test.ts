import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * V1: Privilege escalation via onboarding endpoint
 *
 * The /api/auth/onboarding endpoint must:
 * 1. Reject users who already have a role (403)
 * 2. Only allow STUDENT or EMPLOYEE roles (not ADMIN)
 */

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

describe('V1: Privilege escalation — /api/auth/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject a user who already has a role (STUDENT cannot re-enter onboarding)', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'student@test.com', role: 'STUDENT' },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'STUDENT',
    } as any);

    // The handler should check currentUser.role and return 403
    // This test verifies the guard exists in the code
    const { POST } = await import('@/app/api/auth/onboarding/route');

    // Simulate the request
    const request = new Request('http://localhost/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'EMPLOYEE' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(403);
  });

  it('should reject a user who already has a role (EMPLOYEE cannot re-enter onboarding)', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-2', email: 'employee@test.com', role: 'EMPLOYEE' },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'EMPLOYEE',
    } as any);

    const { POST } = await import('@/app/api/auth/onboarding/route');

    const request = new Request('http://localhost/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'STUDENT' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(403);
  });

  it('should reject ADMIN role even for users without a role', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-3', email: 'new@test.com', role: null },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: null,
    } as any);

    const { POST } = await import('@/app/api/auth/onboarding/route');

    const request = new Request('http://localhost/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMIN' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid role');
  });

  it('should allow a new user (no role) to select STUDENT', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-4', email: 'new@test.com', role: null },
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: null,
    } as any);

    vi.mocked(prisma.user.update).mockResolvedValue({} as any);

    const { POST } = await import('@/app/api/auth/onboarding/route');

    const request = new Request('http://localhost/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'STUDENT' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });
});
