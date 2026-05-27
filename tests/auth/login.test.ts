/**
 * Integration tests for login API route.
 *
 * Tests POST /api/auth/login by calling the route handler directly with a mock
 * request. Mocks @/lib/auth (validateUser) to avoid importing NextAuth's ESM
 * dependency chain that Jest cannot transform.
 *
 * Covers:
 *   - Successful login with valid credentials (200)
 *   - Wrong password (401)
 *   - Non-existent user (401)
 *   - Social-auth-only account (401)
 *   - Zod validation error (400) for invalid input
 */

import { NextRequest, NextResponse } from 'next/server';

// ──── Mocks ──────────────────────────────────────────────────────────────────
// Mock @/lib/auth to avoid importing NextAuth (which pulls in ESM-only
// dependencies like @auth/core that Jest cannot transform).
const mockValidateUser = jest.fn();

jest.mock('@/lib/auth', () => ({
  validateUser: mockValidateUser,
}));

// ──── Route handler import (must come after mocks) ───────────────────────────

import { POST as login } from '@/app/api/auth/login/route';

// ──── Helpers ────────────────────────────────────────────────────────────────

function mockRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

async function parseResponse(response: NextResponse) {
  const body = await response.json();
  return { status: response.status, body };
}

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'STUDENT',
    phone: '9876543210',
    studentProfile: { fullName: 'Test User' },
    employeeProfile: null,
    parentProfile: null,
    ...overrides,
  };
}

// ──── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Login (POST /api/auth/login)', () => {
  it('should authenticate with valid credentials and return user data', async () => {
    const user = makeUser();
    mockValidateUser.mockResolvedValue(user);

    const response = await login(mockRequest({ email: 'test@example.com', password: 'StrongPass1' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body).toMatchObject({
      message: 'Login successful',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'STUDENT',
        phone: '9876543210',
      },
    });
    expect(mockValidateUser).toHaveBeenCalledWith('test@example.com', 'StrongPass1');
  });

  it('should return 401 for non-existent user', async () => {
    mockValidateUser.mockRejectedValue(new Error('USER_NOT_FOUND'));

    const response = await login(mockRequest({ email: 'nobody@example.com', password: 'StrongPass1' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(401);
    expect(body.error).toMatch(/no account found/i);
  });

  it('should return 401 for incorrect password', async () => {
    mockValidateUser.mockRejectedValue(new Error('INVALID_PASSWORD'));

    const response = await login(mockRequest({ email: 'test@example.com', password: 'WrongPass1' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(401);
    expect(body.error).toMatch(/incorrect password/i);
  });

  it('should return 401 for social-auth-only account (no passwordHash)', async () => {
    mockValidateUser.mockRejectedValue(new Error('SOCIAL_AUTH_ONLY'));

    const response = await login(mockRequest({ email: 'test@example.com', password: 'StrongPass1' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(401);
    expect(body.error).toMatch(/google to sign in/i);
  });

  it('should return 400 for Zod validation failure on invalid email format', async () => {
    const response = await login(mockRequest({ email: 'not-an-email', password: 'StrongPass1' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toMatch(/invalid input/i);
    expect(mockValidateUser).not.toHaveBeenCalled();
  });

  it('should return 400 for Zod validation failure on short password', async () => {
    const response = await login(mockRequest({ email: 'test@example.com', password: 'short' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toMatch(/invalid input/i);
    expect(mockValidateUser).not.toHaveBeenCalled();
  });

  it('should return 400 for empty request body', async () => {
    const response = await login(mockRequest({}));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBeDefined();
    expect(mockValidateUser).not.toHaveBeenCalled();
  });
});
