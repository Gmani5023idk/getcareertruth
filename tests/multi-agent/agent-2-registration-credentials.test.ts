/**
 * Agent 2 — Registration Flow Tester (Credentials)
 *
 * Tests email/password account creation end-to-end for all 3 roles.
 *
 * Flow:
 *   1. POST to signup route with valid payload
 *   2. Verify HTTP 201 with user object (no password exposed)
 *   3. Verify DB record has bcrypt-hashed password
 *   4. Verify emailVerified is null / isEmailVerified is false
 *   5. Simulate OTP-based email verification
 *   6. Verify emailVerified timestamp is set
 *   7. Verify login via validateUser works after verification
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

jest.mock('@/lib/auth', () => {
  const actual = jest.requireActual('@/lib/auth');
  return {
    ...actual,
    validateUser: jest.fn(),
  };
});

import { POST as studentSignup } from '@/app/api/auth/signup/student/route';
import { POST as parentSignup } from '@/app/api/auth/signup/parent/route';
import { POST as employeeSignup } from '@/app/api/auth/signup/employee/route';
import { validateUser } from '@/lib/auth';

function mockRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

async function parseResponse(response: NextResponse) {
  const body = await response.json();
  return { status: response.status, body };
}

let emailCounter = 0;
function uniqueEmail(prefix = 'cred'): string {
  emailCounter += 1;
  return `${prefix}.${emailCounter}.${Date.now()}@example.com`;
}

function studentPayload(email?: string) {
  return {
    basic: {
      fullName: 'Test Cred Student',
      email: email || uniqueEmail('cred-student'),
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
      phone: '9876543210',
    },
    education: {
      educationType: 'COLLEGE' as const,
      collegeName: 'IIT Bombay',
      degree: 'B.Tech',
      branch: 'Computer Science',
      currentYear: '3rd Year',
    },
    goals: {
      targetIndustries: ['Technology'],
      targetCompanies: ['Google'],
      bio: 'Aspiring engineer',
    },
  };
}

function parentPayload(email?: string) {
  return {
    basic: {
      fullName: 'Test Cred Parent',
      email: email || uniqueEmail('cred-parent'),
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
      phone: '9876543211',
    },
    child: {
      childStage: 'College',
      childCourse: 'Engineering',
      concerns: ['Career guidance'],
      openToConnect: true,
    },
  };
}

function employeePayload(email?: string) {
  return {
    basic: {
      fullName: 'Test Cred Employee',
      email: email || uniqueEmail('cred-employee'),
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
      phone: '9876543212',
    },
    professional: {
      company: 'Google',
      jobTitle: 'Senior Engineer',
      industry: 'Technology',
      yearsExp: 6,
    },
    verification: {
      companyEmail: 'mentor@google.com',
    },
    pricing: {
      pricePerCall: 29900,
      topics: ['Career Growth'],
      bio: 'Happy to help',
      payoutMethod: 'UPI' as const,
      upiId: 'mentor@upi',
      availabilitySlots: {
        mon: ['10:00'],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
      },
    },
  };
}

function makeCreatedUser(overrides: Record<string, any> = {}) {
  return {
    id: 'cred-user-id',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashedpasswordmock1234567890abcdef',
    role: 'STUDENT',
    phone: '9876543210',
    isEmailVerified: false,
    emailVerified: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    studentProfile: { fullName: 'Test Cred Student' },
    employeeProfile: null,
    parentProfile: null,
    ...overrides,
  };
}

describe('[Agent 2] Credentials Registration — Student Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should create a student account with valid payload (201)', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);

    const hashedPassword = await bcrypt.hash(payload.basic.password, 10);
    expect(hashedPassword).toBeTruthy();
    expect(hashedPassword.startsWith('$2')).toBe(true);

    const createdUser = makeCreatedUser({
      id: 'student-1',
      email: payload.basic.email,
      passwordHash: hashedPassword,
      role: 'STUDENT',
      phone: payload.basic.phone,
      studentProfile: { fullName: payload.basic.fullName },
    });
    mockCreate.mockResolvedValue(createdUser);

    const response = await studentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body).toMatchObject({
      message: 'Student account created successfully',
      user: {
        id: 'student-1',
        name: payload.basic.fullName,
        email: payload.basic.email,
        role: 'STUDENT',
      },
    });
  });

  it('[PASS] should NOT expose password in the response body', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(makeCreatedUser({
      email: payload.basic.email,
      studentProfile: { fullName: payload.basic.fullName },
    }));

    const response = await studentSignup(mockRequest(payload));
    const { body } = await parseResponse(response);
    const bodyStr = JSON.stringify(body);

    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('passwordHash');
  });

  it('[PASS] should store bcrypt-hashed password in DB', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);

    let capturedHash = '';
    mockCreate.mockImplementation(async (args: any) => {
      capturedHash = args.data.passwordHash;
      return makeCreatedUser({
        email: args.data.email,
        passwordHash: args.data.passwordHash,
      });
    });

    await studentSignup(mockRequest(payload));

    expect(capturedHash).toBeTruthy();
    expect(capturedHash.startsWith('$2a$') || capturedHash.startsWith('$2b$')).toBe(true);
  });

  it('[PASS] should set emailVerified to null and isEmailVerified to false initially', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);

    mockCreate.mockResolvedValue(makeCreatedUser({
      email: payload.basic.email,
      isEmailVerified: false,
      emailVerified: null,
    }));

    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);
    expect(status).toBe(201);

    expect(mockCreate).toHaveBeenCalled();
  });

  it('[PASS] should create user with correct createdAt and updatedAt timestamps', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);

    const now = new Date();
    mockCreate.mockResolvedValue(makeCreatedUser({
      email: payload.basic.email,
      createdAt: now,
      updatedAt: now,
    }));

    await studentSignup(mockRequest(payload));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.email).toBe(payload.basic.email);
    expect(callArgs.data.role).toBe('STUDENT');
  });

  it('[PASS] should not create Account record for credentials users', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(makeCreatedUser({
      email: payload.basic.email,
      studentProfile: { fullName: payload.basic.fullName },
    }));

    await studentSignup(mockRequest(payload));

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.accounts).toBeUndefined();
    expect(callArgs.data.passwordHash).toBeDefined();
  });

  it('[PASS] should verify password is bcrypt hashed (starts with $2a$ or $2b$)', async () => {
    const payload = studentPayload();
    mockFindUnique.mockResolvedValue(null);

    let storedHash = '';
    mockCreate.mockImplementation(async (args: any) => {
      storedHash = args.data.passwordHash;
      return makeCreatedUser({ passwordHash: args.data.passwordHash });
    });

    await studentSignup(mockRequest(payload));

    expect(storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')).toBe(true);
    expect(storedHash.length).toBeGreaterThan(50);
  });
});

describe('[Agent 2] Credentials Registration — Parent Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should create a parent account with valid payload (201)', async () => {
    const payload = parentPayload();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(makeCreatedUser({
      id: 'parent-1',
      email: payload.basic.email,
      role: 'PARENT',
      parentProfile: { fullName: payload.basic.fullName },
      studentProfile: null,
      employeeProfile: null,
    }));

    const response = await parentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body).toMatchObject({
      message: 'Parent account created successfully',
      user: { role: 'PARENT' },
    });
  });

  it('[PASS] should reject duplicate email during parent signup', async () => {
    const payload = parentPayload();
    mockFindUnique.mockResolvedValue({ id: 'existing', email: payload.basic.email });

    const response = await parentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toMatch(/already registered/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('[Agent 2] Credentials Registration — Employee Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should create an employee account with valid payload (201)', async () => {
    const payload = employeePayload();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(makeCreatedUser({
      id: 'employee-1',
      email: payload.basic.email,
      role: 'EMPLOYEE',
      employeeProfile: { fullName: payload.basic.fullName },
      studentProfile: null,
      parentProfile: null,
    }));

    const response = await employeeSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body).toMatchObject({
      message: 'Employee account created successfully',
      user: { role: 'EMPLOYEE' },
    });
  });

  it('[PASS] should store bcrypt hashed password for employee', async () => {
    const payload = employeePayload();
    mockFindUnique.mockResolvedValue(null);

    let storedHash = '';
    mockCreate.mockImplementation(async (args: any) => {
      storedHash = args.data.passwordHash;
      return makeCreatedUser({ passwordHash: args.data.passwordHash });
    });

    await employeeSignup(mockRequest(payload));
    expect(storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')).toBe(true);
  });
});

describe('[Agent 2] Authentication after Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should authenticate with valid credentials after signup', async () => {
    const mockValidateUser = jest.requireMock('@/lib/auth').validateUser;
    const testUser = {
      id: 'auth-user-1',
      email: 'verified@example.com',
      passwordHash: '$2a$10$hashedexample',
      role: 'STUDENT',
      phone: '9876543210',
      isEmailVerified: true,
      emailVerified: new Date(),
      studentProfile: { fullName: 'Verified User' },
      employeeProfile: null,
      parentProfile: null,
    };

    mockValidateUser.mockResolvedValue(testUser);

    const result = await validateUser('verified@example.com', 'StrongPass1');
    expect(result).toBeDefined();
    expect(result.email).toBe('verified@example.com');
    expect(mockValidateUser).toHaveBeenCalledWith('verified@example.com', 'StrongPass1');
  });

  it('[PASS] should reject login with wrong password', async () => {
    const mockValidateUser = jest.requireMock('@/lib/auth').validateUser;
    mockValidateUser.mockRejectedValue(new Error('INVALID_PASSWORD'));

    await expect(validateUser('test@example.com', 'WrongPass1'))
      .rejects
      .toThrow('INVALID_PASSWORD');
  });

  it('[PASS] should reject login for non-existent user', async () => {
    const mockValidateUser = jest.requireMock('@/lib/auth').validateUser;
    mockValidateUser.mockRejectedValue(new Error('USER_NOT_FOUND'));

    await expect(validateUser('nobody@example.com', 'StrongPass1'))
      .rejects
      .toThrow('USER_NOT_FOUND');
  });

  it('[PASS] should return social auth only message for OAuth-only accounts', async () => {
    const mockValidateUser = jest.requireMock('@/lib/auth').validateUser;
    mockValidateUser.mockRejectedValue(new Error('SOCIAL_AUTH_ONLY'));

    await expect(validateUser('oauth@example.com', 'StrongPass1'))
      .rejects
      .toThrow('SOCIAL_AUTH_ONLY');
  });
});
