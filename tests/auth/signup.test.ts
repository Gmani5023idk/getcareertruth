/**
 * Integration tests for signup API routes.
 *
 * Tests all 3 roles (student, parent, employee) by calling the Next.js App Router
 * route handler directly with a mock request, covering:
 *   - Successful signup (201) with correct profile creation
 *   - Duplicate email rejection (400)
 *   - Zod validation failures for missing/malformed data
 *   - Response shape (user.id, user.role, user.email)
 */

import { NextRequest, NextResponse } from 'next/server';

// ──── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-mock'),
  compare: jest.fn(),
}));

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

// ──── Route handler imports (must come after mocks) ──────────────────────────

import { POST as studentSignup } from '@/app/api/auth/signup/student/route';
import { POST as parentSignup } from '@/app/api/auth/signup/parent/route';
import { POST as employeeSignup } from '@/app/api/auth/signup/employee/route';

// ──── Helpers ────────────────────────────────────────────────────────────────

/** Create a minimal mock NextRequest with the given JSON body. */
function mockRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

/** Parse a NextResponse and return { status, body }. */
async function parseResponse(response: NextResponse) {
  const body = await response.json();
  return { status: response.status, body };
}

/** Unique email per test to avoid cross-test interference. */
let emailCounter = 0;
function uniqueEmail(prefix = 'test'): string {
  emailCounter += 1;
  return `${prefix}.${emailCounter}.${Date.now()}@example.com`;
}

// ──── Shared valid payloads ──────────────────────────────────────────────────

function validStudentPayload() {
  return {
    basic: {
      fullName: 'Test Student',
      email: uniqueEmail('student'),
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
      targetIndustries: ['Technology', 'Software'],
      targetCompanies: ['Google', 'Microsoft'],
      bio: 'Aspiring software engineer',
    },
  };
}

function validParentPayload() {
  return {
    basic: {
      fullName: 'Test Parent',
      email: uniqueEmail('parent'),
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
      phone: '9876543211',
    },
    child: {
      childStage: 'College',
      childCourse: 'Engineering',
      concerns: ['Career guidance', 'College selection'],
      openToConnect: true,
    },
  };
}

function validEmployeePayload() {
  return {
    basic: {
      fullName: 'Test Mentor',
      email: uniqueEmail('employee'),
      password: 'StrongPass1',
      confirmPassword: 'StrongPass1',
      phone: '9876543212',
    },
    professional: {
      company: 'Google',
      jobTitle: 'Senior Software Engineer',
      industry: 'Technology',
      yearsExp: 6,
    },
    verification: {
      companyEmail: 'mentor@google.com',
      documentUrls: ['https://example.com/id.pdf'],
    },
    pricing: {
      pricePerCall: 29900, // ₹299
      topics: ['Career Growth', 'System Design', 'Tech Interviews'],
      bio: '10 years in FAANG, happy to help',
      availabilitySlots: {
        mon: ['10:00', '11:00'],
        tue: ['14:00', '15:00'],
        wed: [],
        thu: ['10:00'],
        fri: ['16:00'],
        sat: [],
        sun: [],
      },
      payoutMethod: 'UPI' as const,
      upiId: 'mentor@upi',
    },
  };
}

// ──── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ──── Student signup ─────────────────────────────────────────────────────────

describe('Student Signup (POST /api/auth/signup/student)', () => {
  it('should create a student account with valid payload', async () => {
    const payload = validStudentPayload();

    // Simulate no existing user
    mockFindUnique.mockResolvedValue(null);

    // Simulate successful user creation
    const createdUser = {
      id: 'student-1',
      email: payload.basic.email,
      passwordHash: 'hashed-password-mock',
      role: 'STUDENT',
      phone: payload.basic.phone,
      studentProfile: {
        fullName: payload.basic.fullName,
        educationType: payload.education.educationType,
        collegeName: payload.education.collegeName,
        degree: payload.education.degree,
        branch: payload.education.branch,
        currentYear: payload.education.currentYear,
        targetIndustries: payload.goals.targetIndustries,
        targetCompanies: payload.goals.targetCompanies,
        bio: payload.goals.bio,
      },
    };
    mockCreate.mockResolvedValue(createdUser);

    const response = await studentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    // Assert success response shape
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

    // Assert prisma was called correctly
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.role).toBe('STUDENT');
    expect(createCall.data.email).toBe(payload.basic.email);
    expect(createCall.data.studentProfile.create.fullName).toBe(payload.basic.fullName);
    expect(createCall.data.studentProfile.create.collegeName).toBe(payload.education.collegeName);
    expect(createCall.data.studentProfile.create.targetIndustries).toEqual(payload.goals.targetIndustries);
  });

  it('should reject duplicate email during student signup', async () => {
    const payload = validStudentPayload();

    // Simulate existing user
    mockFindUnique.mockResolvedValue({ id: 'existing', email: payload.basic.email });

    const response = await studentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toMatch(/already registered/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject student signup with missing confirmPassword', async () => {
    const payload = validStudentPayload();
    // Omit confirmPassword
    delete (payload.basic as any).confirmPassword;

    mockFindUnique.mockResolvedValue(null);

    const response = await studentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    // Zod validation failure -> 500
    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject student signup with password mismatch', async () => {
    const payload = validStudentPayload();
    // confirmPassword differs from password
    payload.basic.confirmPassword = 'DifferentPass1';

    mockFindUnique.mockResolvedValue(null);

    const response = await studentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    // Zod refine failure -> 500
    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(body.error).toMatch(/passwords don\'t match/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject student signup with empty body', async () => {
    const response = await studentSignup(mockRequest({}));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ──── Parent signup ──────────────────────────────────────────────────────────

describe('Parent Signup (POST /api/auth/signup/parent)', () => {
  it('should create a parent account with valid payload', async () => {
    const payload = validParentPayload();

    mockFindUnique.mockResolvedValue(null);

    const createdUser = {
      id: 'parent-1',
      email: payload.basic.email,
      passwordHash: 'hashed-password-mock',
      role: 'PARENT',
      phone: payload.basic.phone,
      parentProfile: {
        fullName: payload.basic.fullName,
        childStage: payload.child.childStage,
        childCourse: payload.child.childCourse,
        concerns: payload.child.concerns,
        openToConnect: payload.child.openToConnect,
      },
    };
    mockCreate.mockResolvedValue(createdUser);

    const response = await parentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body).toMatchObject({
      message: 'Parent account created successfully',
      user: {
        id: 'parent-1',
        name: payload.basic.fullName,
        email: payload.basic.email,
        role: 'PARENT',
      },
    });

    // Verify correct profile type was created
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.role).toBe('PARENT');
    expect(createCall.data.parentProfile.create).toBeDefined();
    expect(createCall.data.parentProfile.create.childStage).toBe(payload.child.childStage);
    expect(createCall.data.parentProfile.create.concerns).toEqual(payload.child.concerns);
  });

  it('should reject duplicate email during parent signup', async () => {
    const payload = validParentPayload();
    mockFindUnique.mockResolvedValue({ id: 'existing', email: payload.basic.email });

    const response = await parentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toMatch(/already registered/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject parent signup with missing child concerns', async () => {
    const payload = validParentPayload();
    (payload.child as any).concerns = [];

    mockFindUnique.mockResolvedValue(null);

    const response = await parentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject parent signup with password mismatch', async () => {
    const payload = validParentPayload();
    payload.basic.confirmPassword = 'DifferentPass1';

    mockFindUnique.mockResolvedValue(null);

    const response = await parentSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(body.error).toMatch(/passwords don\'t match/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ──── Employee signup ────────────────────────────────────────────────────────

describe('Employee Signup (POST /api/auth/signup/employee)', () => {
  it('should create an employee account with valid payload', async () => {
    const payload = validEmployeePayload();

    mockFindUnique.mockResolvedValue(null);

    const createdUser = {
      id: 'employee-1',
      email: payload.basic.email,
      passwordHash: 'hashed-password-mock',
      role: 'EMPLOYEE',
      phone: payload.basic.phone,
      employeeProfile: {
        fullName: payload.basic.fullName,
        company: payload.professional.company,
        jobTitle: payload.professional.jobTitle,
        industry: payload.professional.industry,
        yearsExp: payload.professional.yearsExp,
        companyEmail: payload.verification.companyEmail,
        pricePerCall: payload.pricing.pricePerCall,
        payoutMethod: payload.pricing.payoutMethod,
        upiId: payload.pricing.upiId,
        topics: payload.pricing.topics,
        bio: payload.pricing.bio,
        availabilitySlots: payload.pricing.availabilitySlots,
      },
    };
    mockCreate.mockResolvedValue(createdUser);

    const response = await employeeSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(201);
    expect(body).toMatchObject({
      message: 'Employee account created successfully',
      user: {
        id: 'employee-1',
        name: payload.basic.fullName,
        email: payload.basic.email,
        role: 'EMPLOYEE',
      },
    });

    // Verify correct profile type and fields
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.role).toBe('EMPLOYEE');
    expect(createCall.data.employeeProfile.create).toBeDefined();
    expect(createCall.data.employeeProfile.create.company).toBe(payload.professional.company);
    expect(createCall.data.employeeProfile.create.jobTitle).toBe(payload.professional.jobTitle);
    expect(createCall.data.employeeProfile.create.payoutMethod).toBe('UPI');
    expect(createCall.data.employeeProfile.create.companyEmail).toBe(payload.verification.companyEmail);
    expect(createCall.data.employeeProfile.create.pricePerCall).toBe(29900);
    expect(createCall.data.employeeProfile.create.topics).toEqual(payload.pricing.topics);
    expect(createCall.data.employeeProfile.create.availabilitySlots).toEqual(payload.pricing.availabilitySlots);
  });

  it('should reject duplicate email during employee signup', async () => {
    const payload = validEmployeePayload();
    mockFindUnique.mockResolvedValue({ id: 'existing', email: payload.basic.email });

    const response = await employeeSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toMatch(/already registered/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject employee signup with invalid payout method', async () => {
    const payload = validEmployeePayload();
    (payload.pricing as any).payoutMethod = 'BANK_TRANSFER'; // not in enum

    mockFindUnique.mockResolvedValue(null);

    const response = await employeeSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500); // Zod validation fails
    expect(body.error).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject employee signup with missing professional details', async () => {
    const payload = validEmployeePayload();
    delete (payload.professional as any).company;

    mockFindUnique.mockResolvedValue(null);

    const response = await employeeSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should reject employee signup with password mismatch', async () => {
    const payload = validEmployeePayload();
    payload.basic.confirmPassword = 'DifferentPass1';

    mockFindUnique.mockResolvedValue(null);

    const response = await employeeSignup(mockRequest(payload));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(500);
    expect(body.error).toBeDefined();
    expect(body.error).toMatch(/passwords don\'t match/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ──── Cross-cutting concerns ─────────────────────────────────────────────────

describe('Signup cross-cutting concerns', () => {
  it('should hash password with bcrypt for all roles', async () => {
    const bcrypt = require('bcryptjs');

    // Student
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'u1', role: 'STUDENT', email: uniqueEmail(), studentProfile: { fullName: 'A' } });
    await studentSignup(mockRequest(validStudentPayload()));
    expect(bcrypt.hash).toHaveBeenCalled();

    jest.clearAllMocks();

    // Parent
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'u2', role: 'PARENT', email: uniqueEmail(), parentProfile: { fullName: 'B' } });
    await parentSignup(mockRequest(validParentPayload()));
    expect(bcrypt.hash).toHaveBeenCalled();

    jest.clearAllMocks();

    // Employee
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'u3', role: 'EMPLOYEE', email: uniqueEmail(), employeeProfile: { fullName: 'C' } });
    await employeeSignup(mockRequest(validEmployeePayload()));
    expect(bcrypt.hash).toHaveBeenCalled();
  });

  it('should check for existing user before creating for all roles', async () => {
    // Student
    mockFindUnique.mockResolvedValue({ id: 'existing' });
    let res = await studentSignup(mockRequest(validStudentPayload()));
    expect(res.status).toBe(400);

    mockFindUnique.mockResolvedValue({ id: 'existing' });
    res = await parentSignup(mockRequest(validParentPayload()));
    expect(res.status).toBe(400);

    mockFindUnique.mockResolvedValue({ id: 'existing' });
    res = await employeeSignup(mockRequest(validEmployeePayload()));
    expect(res.status).toBe(400);
  });

  it('should handle empty request body gracefully for all roles', async () => {
    let res = await studentSignup(mockRequest({}));
    expect(res.status).toBe(500);

    res = await parentSignup(mockRequest({}));
    expect(res.status).toBe(500);

    res = await employeeSignup(mockRequest({}));
    expect(res.status).toBe(500);
  });
});
