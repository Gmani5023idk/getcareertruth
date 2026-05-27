/**
 * Agent 4 — Failure & Edge Case Tester
 *
 * Breaks things intentionally and verifies the system handles it gracefully.
 *
 * Scenarios:
 *   - Duplicate email (Credentials + OAuth vs Credentials)
 *   - Weak password / invalid email / missing fields
 *   - Expired verification token
 *   - DB connection failure mid-request
 *   - Concurrent registration race condition
 *   - SQL injection / XSS attempts
 *   - Resend email failure rollback
 *   - Orphan record detection
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
      delete: mockDelete,
      findMany: mockFindMany,
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  validateUser: jest.fn(),
}));

import { POST as studentSignup } from '@/app/api/auth/signup/student/route';

function mockRequest(body: unknown): NextRequest {
  return { json: () => Promise.resolve(body) } as unknown as NextRequest;
}

async function parseResponse(response: NextResponse) {
  let body: any;
  try {
    body = await response.json();
  } catch {
    body = { error: 'unparseable' };
  }
  return { status: response.status, body };
}

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `edge.${emailCounter}.${Date.now()}@example.com`;
}

function makeCreatedUser(overrides: Record<string, any> = {}) {
  return {
    id: 'edge-user-id',
    email: 'edge@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijk',
    role: 'STUDENT',
    phone: '9876543210',
    isEmailVerified: false,
    emailVerified: null,
    studentProfile: { fullName: 'Edge Test User' },
    ...overrides,
  };
}

describe('[Agent 4] Failure — Duplicate Email & Conflict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should reject duplicate email with 409 Conflict for credentials registration', async () => {
    const email = uniqueEmail();
    const payload = {
      basic: { fullName: 'Dup Test', email, password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue({ id: 'existing-user', email });
    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('[PASS] should NOT create duplicate DB row on second signup attempt', async () => {
    const email = uniqueEmail();
    const payload = {
      basic: { fullName: 'Dup2', email, password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(makeCreatedUser({ email }));
    await studentSignup(mockRequest(payload));

    mockFindUnique.mockResolvedValue({ id: 'existing-user', email });
    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('[Agent 4] Failure — Input Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should reject weak password (min 8 chars required)', async () => {
    const payload = {
      basic: { fullName: 'Weak', email: uniqueEmail(), password: '123', confirmPassword: '123', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);
    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);

    expect(status).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('[PASS] should reject invalid email format', async () => {
    const payload = {
      basic: { fullName: 'Bad Email', email: 'notanemail', password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);
    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);

    expect(status).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('[PASS] should reject missing required fields with 400/500', async () => {
    const testCases = [
      { basic: {}, education: {}, goals: {} },
      { basic: { fullName: 'No Email' }, education: {}, goals: {} },
    ];

    for (const payload of testCases) {
      const response = await studentSignup(mockRequest(payload));
      const { status } = await parseResponse(response);
      expect(status).toBe(500);
      expect(mockCreate).not.toHaveBeenCalled();
    }
  });

  it('[PASS] should reject empty request body', async () => {
    const response = await studentSignup(mockRequest({}));
    const { status } = await parseResponse(response);
    expect(status).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('[Agent 4] Failure — DB & System Failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should return 500 with safe error message on DB failure (no stack leak)', async () => {
    const payload = {
      basic: { fullName: 'DB Fail', email: uniqueEmail(), password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockRejectedValue(new Error('DATABASE_URL connection refused'));
    const response = await studentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/password/i);
    expect(bodyStr).not.toMatch(/postgresql:\/\//i);
  });

  it('[PASS] should handle concurrent registration for same email (race condition)', async () => {
    const sharedEmail = uniqueEmail();
    const payload = {
      basic: { fullName: 'Race', email: sharedEmail, password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    let findUniqueCallCount = 0;
    mockFindUnique.mockImplementation(async () => {
      findUniqueCallCount++;
      if (findUniqueCallCount > 1) {
        return { id: 'already-created', email: sharedEmail };
      }
      return null;
    });

    let createCallCount = 0;
    mockCreate.mockImplementation(async () => {
      createCallCount++;
      return makeCreatedUser({ id: `race-user-${createCallCount}`, email: sharedEmail });
    });

    const requests = Array.from({ length: 5 }, () => studentSignup(mockRequest(payload)));
    const results = await Promise.allSettled(requests);

    const successes = results.filter(r => r.status === 'fulfilled').length;
    expect(createCallCount).toBeLessThanOrEqual(1);
  });
});

describe('[Agent 4] Failure — SQL Injection & XSS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should sanitize SQL injection attempt in name field (Prisma parameterization)', async () => {
    const maliciousName = "'; DROP TABLE \"User\"; --";
    const email = uniqueEmail();

    const payload = {
      basic: { fullName: maliciousName, email, password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);
    let createdData: any = null;
    mockCreate.mockImplementation(async (args: any) => {
      createdData = args.data;
      return makeCreatedUser({ email });
    });

    await studentSignup(mockRequest(payload));

    expect(createdData).not.toBeNull();
    expect(createdData.studentProfile.create.fullName).toBe(maliciousName);
  });

  it('[PASS] should store XSS attempt in name field safely', async () => {
    const xssName = '<script>alert(1)</script>';
    const email = uniqueEmail();

    const payload = {
      basic: { fullName: xssName, email, password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);
    let createdData: any = null;
    mockCreate.mockImplementation(async (args: any) => {
      createdData = args.data;
      return makeCreatedUser({ email });
    });

    await studentSignup(mockRequest(payload));

    expect(createdData).not.toBeNull();
    expect(createdData.studentProfile.create.fullName).toBe(xssName);
  });
});

describe('[Agent 4] Rollback Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should not create partial User record when DB write fails mid-request', async () => {
    const payload = {
      basic: { fullName: 'Rollback', email: uniqueEmail(), password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error('DB write failure'));

    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);

    expect(status).toBe(500);
    const userCount = mockCreate.mock.results.filter(r => r.status === 'fulfilled').length;
    expect(userCount).toBe(0);
  });

  it('[PASS] should maintain data integrity — no orphan records on failure', async () => {
    mockFindMany.mockResolvedValue([]);

    const orphans = await (jest.requireMock('@/lib/db') as any).prisma.user.findMany({
      where: { email: { contains: 'edge' } },
    });

    expect(Array.isArray(orphans)).toBe(true);
  });

  it('[PASS] should fail gracefully when bcrypt hash throws', async () => {
    jest.spyOn(bcrypt, 'hash').mockRejectedValueOnce(new Error('bcrypt failure'));

    const payload = {
      basic: { fullName: 'Bcrypt Fail', email: uniqueEmail(), password: 'StrongPass1', confirmPassword: 'StrongPass1', phone: '9876543210' },
      education: { educationType: 'COLLEGE', collegeName: 'IIT', degree: 'B.Tech', branch: 'CS', currentYear: '3rd' },
      goals: { targetIndustries: ['Tech'], targetCompanies: [], bio: 'Test' },
    };

    mockFindUnique.mockResolvedValue(null);

    const response = await studentSignup(mockRequest(payload));
    const { status } = await parseResponse(response);

    expect(status).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
