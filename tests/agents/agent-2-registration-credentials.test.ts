/**
 * AGENT 2: Registration Flow Tester (Credentials)
 * Tests email/password account creation end-to-end for Student, Employee, and Parent roles
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateTestEmail, cleanupTestUsers, isValidPasswordHash, maskEmail } from '../helpers/db-helpers';

const prisma = new PrismaClient();

const testResults: Record<string, any> = {
  checks: [],
  summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
  testUsers: [],
};

describe('Agent 2 - Registration Flow Tester (Credentials)', () => {
  beforeAll(async () => {
    console.log('\n🟢 Agent 2: Starting Credentials Registration Tests');
  }, 30000);

  afterAll(async () => {
    console.log('\n📊 Agent 2 Test Summary:');
    console.table(testResults.checks);
    console.log(`\nTotal: ${testResults.summary.total}, Passed: ${testResults.summary.passed}, Failed: ${testResults.summary.failed}, Skipped: ${testResults.summary.skipped}`);
    
    // Cleanup test users
    try {
      const cleanup = await cleanupTestUsers('testuser_');
      console.log(`\n🧹 Cleaned up ${cleanup.deletedUsers} test users, ${cleanup.deletedAccounts} accounts, ${cleanup.deletedSessions} sessions`);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
    
    await prisma.$disconnect();
  }, 10000);

  // Helper to record test results
  const recordCheck = (test: string, status: 'PASS' | 'FAIL' | 'SKIP', notes: string, details?: any) => {
    const check = {
      timestamp: new Date().toISOString(),
      test,
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
      ...(details && { details }),
    };
    testResults.checks.push(check);
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;
    else testResults.summary.skipped++;
    return check;
  };

  // Test 2.1: Student Registration
  it('should create a new Student account with valid credentials', async () => {
    const studentEmail = generateTestEmail('student');
    const studentPassword = 'Test@1234!';
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';
    const studentData: any = {};

    try {
      // Call signup endpoint
      const response = await fetch('http://localhost:3000/api/auth/signup/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basic: {
            fullName: 'Test Student',
            email: studentEmail,
            phone: '+1234567890',
            password: studentPassword,
            confirmPassword: studentPassword,
          },
          education: {
            educationType: 'COLLEGE',
            collegeName: 'Test University',
            branch: 'Computer Science',
            currentYear: '3',
          },
          goals: {
            targetIndustries: ['Tech'],
            targetCompanies: ['Google'],
            bio: 'Test bio',
          },
        }),
      });

      studentData.httpStatus = response.status;
      const body = await response.json();
      studentData.response = body;

      if (response.status === 201) {
        // Verify DB record
        const user = await prisma.user.findUnique({
          where: { email: studentEmail },
          include: { studentProfile: true },
        });

        if (!user) {
          status = 'FAIL';
          notes = 'User not found in database after successful response';
        } else {
          studentData.userId = user.id;
          studentData.emailVerified = user.emailVerified;
          studentData.isEmailVerified = user.isEmailVerified;
          testResults.testUsers.push({ id: user.id, email: studentEmail, role: 'STUDENT' });

          // Check password hash
          if (!isValidPasswordHash(user.passwordHash)) {
            status = 'FAIL';
            notes = 'Password not properly hashed';
          } else {
            // Check student profile
            if (!user.studentProfile) {
              status = 'FAIL';
              notes = 'Student profile not created';
            } else {
              status = 'PASS';
              notes = `Student created: ${maskEmail(studentEmail)}, ID: ${user.id.substring(0, 8)}...`;
              console.log(`✅ ${notes}`);
            }
          }
        }
      } else {
        status = 'FAIL';
        notes = `HTTP ${response.status}: ${JSON.stringify(body)}`;
        console.error(`❌ ${notes}`);
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Registration failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    recordCheck('Student Registration', status, notes, studentData);
    expect(status).toBe('PASS');
  }, 20000);

  // Test 2.2: Employee Registration
  it('should create a new Employee account with valid credentials', async () => {
    const employeeEmail = generateTestEmail('employee');
    const employeePassword = 'Test@5678!';
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';
    const employeeData: any = {};

    try {
      const response = await fetch('http://localhost:3000/api/auth/signup/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basic: {
            fullName: 'Test Employee',
            email: employeeEmail,
            phone: '+1234567891',
            password: employeePassword,
            confirmPassword: employeePassword,
          },
          professional: {
            company: 'Test Corp',
            jobTitle: 'Software Engineer',
            industry: 'Technology',
            yearsExp: 5,
            college: 'Test University',
            degree: 'B.Tech',
          },
        }),
      });

      employeeData.httpStatus = response.status;
      const body = await response.json();
      employeeData.response = body;

      if (response.status === 201) {
        const user = await prisma.user.findUnique({
          where: { email: employeeEmail },
          include: { employeeProfile: true },
        });

        if (!user) {
          status = 'FAIL';
          notes = 'User not found in database';
        } else {
          employeeData.userId = user.id;
          testResults.testUsers.push({ id: user.id, email: employeeEmail, role: 'EMPLOYEE' });

          if (!isValidPasswordHash(user.passwordHash)) {
            status = 'FAIL';
            notes = 'Password not hashed';
          } else if (!user.employeeProfile) {
            status = 'FAIL';
            notes = 'Employee profile not created';
          } else {
            status = 'PASS';
            notes = `Employee created: ${maskEmail(employeeEmail)}, ID: ${user.id.substring(0, 8)}...`;
            console.log(`✅ ${notes}`);
          }
        }
      } else {
        status = 'FAIL';
        notes = `HTTP ${response.status}: ${JSON.stringify(body)}`;
        console.error(`❌ ${notes}`);
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Registration failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    recordCheck('Employee Registration', status, notes, employeeData);
    expect(status).toBe('PASS');
  }, 20000);

  // Test 2.3: Parent Registration
  it('should create a new Parent account with valid credentials', async () => {
    const parentEmail = generateTestEmail('parent');
    const parentPassword = 'Test@9012!';
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';
    const parentData: any = {};

    try {
      const response = await fetch('http://localhost:3000/api/auth/signup/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basic: {
            fullName: 'Test Parent',
            email: parentEmail,
            phone: '+1234567892',
            password: parentPassword,
            confirmPassword: parentPassword,
          },
          personal: {
            city: 'Test City',
            childStage: 'High School',
            childCourse: 'Science',
            concerns: ['Career guidance'],
          },
        }),
      });

      parentData.httpStatus = response.status;
      const body = await response.json();
      parentData.response = body;

      if (response.status === 201) {
        const user = await prisma.user.findUnique({
          where: { email: parentEmail },
          include: { parentProfile: true },
        });

        if (!user) {
          status = 'FAIL';
          notes = 'User not found in database';
        } else {
          parentData.userId = user.id;
          testResults.testUsers.push({ id: user.id, email: parentEmail, role: 'PARENT' });

          if (!isValidPasswordHash(user.passwordHash)) {
            status = 'FAIL';
            notes = 'Password not hashed';
          } else if (!user.parentProfile) {
            status = 'FAIL';
            notes = 'Parent profile not created';
          } else {
            status = 'PASS';
            notes = `Parent created: ${maskEmail(parentEmail)}, ID: ${user.id.substring(0, 8)}...`;
            console.log(`✅ ${notes}`);
          }
        }
      } else {
        status = 'FAIL';
        notes = `HTTP ${response.status}: ${JSON.stringify(body)}`;
        console.error(`❌ ${notes}`);
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Registration failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    recordCheck('Parent Registration', status, notes, parentData);
    expect(status).toBe('PASS');
  }, 20000);

  // Test 2.4: Verify emailVerified is null for credentials users
  it('should set emailVerified to null for credentials users (pending verification)', async () => {
    const testEmail = generateTestEmail('verify');
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';

    try {
      // Create a test user
      await fetch('http://localhost:3000/api/auth/signup/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basic: {
            fullName: 'Verify Test',
            email: testEmail,
            phone: '+1234567893',
            password: 'Test@1234!',
            confirmPassword: 'Test@1234!',
          },
          education: {
            educationType: 'COLLEGE',
            collegeName: 'Test',
            branch: 'CS',
            currentYear: '1',
          },
          goals: {
            targetIndustries: ['Tech'],
            targetCompanies: [],
            bio: '',
          },
        }),
      });

      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      testResults.testUsers.push({ id: user?.id || '', email: testEmail, role: 'STUDENT' });

      if (user) {
        if (user.emailVerified === null && user.isEmailVerified === false) {
          status = 'PASS';
          notes = `emailVerified is null and isEmailVerified is false as expected`;
          console.log(`✅ ${notes}`);
        } else {
          status = 'FAIL';
          notes = `emailVerified=${user.emailVerified}, isEmailVerified=${user.isEmailVerified} (expected null/false)`;
          console.error(`❌ ${notes}`);
        }
      } else {
        status = 'FAIL';
        notes = 'User not created';
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Test failed: ${error.message}`;
    }

    recordCheck('Email Verification State (Credentials)', status, notes);
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 15000);

  // Test 2.5: Duplicate email rejection
  it('should reject duplicate email registration', async () => {
    const dupEmail = generateTestEmail('duplicate');
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'PASS';
    let notes = '';

    try {
      // First registration
      const res1 = await fetch('http://localhost:3000/api/auth/signup/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basic: {
            fullName: 'First User',
            email: dupEmail,
            phone: '+1234567894',
            password: 'Test@1234!',
          },
          education: { educationType: 'COLLEGE', collegeName: 'Test', branch: 'CS', currentYear: '1' },
          goals: { targetIndustries: [], targetCompanies: [], bio: '' },
        }),
      });

      if (res1.status !== 201) {
        status = 'FAIL';
        notes = `First registration failed unexpectedly`;
      } else {
        // Second registration with same email
        const res2 = await fetch('http://localhost:3000/api/auth/signup/student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            basic: {
              fullName: 'Second User',
              email: dupEmail,
              phone: '+1234567895',
              password: 'Test@1234!',
              confirmPassword: 'Test@1234!',
            },
            education: { educationType: 'COLLEGE', collegeName: 'Test', branch: 'CS', currentYear: '2' },
            goals: { targetIndustries: [], targetCompanies: [], bio: '' },
          }),
        });

        if (res2.status === 400 || res2.status === 409) {
          status = 'PASS';
          notes = `Duplicate rejected with HTTP ${res2.status}`;
          console.log(`✅ ${notes}`);
        } else {
          status = 'FAIL';
          notes = `Duplicate not rejected: HTTP ${res2.status}`;
          console.error(`❌ ${notes}`);
        }
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Test failed: ${error.message}`;
    }

    recordCheck('Duplicate Email Rejection', status, notes);
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 15000);
});

export function getAgent2Summary(): typeof testResults {
  return testResults;
}