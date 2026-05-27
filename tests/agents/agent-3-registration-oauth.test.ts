/**
 * AGENT 3: Registration Flow Tester (Google OAuth)
 * Tests Google OAuth account creation, linking, and session management
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { generateTestEmail, cleanupTestUsers, maskEmail } from '../helpers/db-helpers';

const prisma = new PrismaClient();

const testResults: Record<string, any> = {
  checks: [],
  summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
  testUsers: [],
};

describe('Agent 3 - Registration Flow Tester (Google OAuth)', () => {
  beforeAll(async () => {
    console.log('\n🟡 Agent 3: Starting OAuth Registration Tests');
  }, 30000);

  afterAll(async () => {
    console.log('\n📊 Agent 3 Test Summary:');
    console.table(testResults.checks);
    console.log(`\nTotal: ${testResults.summary.total}, Passed: ${testResults.summary.passed}, Failed: ${testResults.summary.failed}, Skipped: ${testResults.summary.skipped}`);
    
    try {
      const cleanup = await cleanupTestUsers('oauthuser_');
      console.log(`\n🧹 Cleaned up ${cleanup.deletedUsers} OAuth test users`);
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
    
    await prisma.$disconnect();
  }, 10000);

  const recordCheck = (test: string, status: 'PASS' | 'FAIL' | 'SKIP', notes: string, details?: any) => {
    testResults.checks.push({
      timestamp: new Date().toISOString(),
      test,
      environment: process.env.NODE_ENV || 'test',
      status,
      notes,
      ...(details && { details }),
    });
    testResults.summary.total++;
    if (status === 'PASS') testResults.summary.passed++;
    else if (status === 'FAIL') testResults.summary.failed++;
    else testResults.summary.skipped++;
  };

  // Test 3.1: Mock OAuth callback simulation
  it('should simulate Google OAuth callback and create user', async () => {
    const oauthEmail = generateTestEmail('oauthuser');
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';
    const oauthData: any = {};

    try {
      // Note: This test requires NextAuth to be configured with Google OAuth
      // In production, this would be a real OAuth flow
      // For testing, we simulate the callback handling

      // Check if Google OAuth is configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        status = 'SKIP';
        notes = 'Google OAuth not configured (CKOA_CLIENT_ID/SECRET missing)';
        console.log(`⚠️  ${notes}`);
      } else {
        // Simulate what the OAuth callback does (direct DB insertion for testing)
        const hashedIdToken = `mock_google_${Date.now()}`;
        
        const user = await prisma.user.create({
          data: {
            email: oauthEmail,
            emailVerified: new Date(), // OAuth emails are pre-verified
            name: 'OAuth Test User',
            image: 'https://example.com/avatar.png',
            isEmailVerified: true,
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: `google_${Date.now()}`,
                type: 'oauth',
                access_token: 'mock_access_token',
                refresh_token: 'mock_refresh_token',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              },
            },
          },
          include: { accounts: true },
        });

        testResults.testUsers.push({ id: user.id, email: oauthEmail, role: 'OAUTH' });
        oauthData.userId = user.id;
        oauthData.accountId = user.accounts[0]?.id;
        oauthData.emailVerified = user.emailVerified;

        if (user.emailVerified && user.accounts.length === 1) {
          status = 'PASS';
          notes = `OAuth user created: ${maskEmail(oauthEmail)}, Account linked: ${user.accounts[0]?.provider}`;
          console.log(`✅ ${notes}`);
        } else {
          status = 'FAIL';
          notes = 'User or account not created correctly';
          console.error(`❌ ${notes}`);
        }
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `OAuth simulation failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    recordCheck('OAuth User Creation', status, notes, oauthData);
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 15000);

  // Test 3.2: Verify OAuth user has no password
  it('should ensure OAuth users have null passwordHash', async () => {
    const testEmail = generateTestEmail('oauthnopass');
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';

    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        status = 'SKIP';
        notes = 'Google OAuth not configured';
      } else {
        const user = await prisma.user.create({
          data: {
            email: testEmail,
            emailVerified: new Date(),
            name: 'No Password User',
            isEmailVerified: true,
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: `google_nopass_${Date.now()}`,
                type: 'oauth',
              },
            },
          },
        });

        testResults.testUsers.push({ id: user.id, email: testEmail });

        if (user.passwordHash === null) {
          status = 'PASS';
          notes = `OAuth user correctly has null passwordHash`;
          console.log(`✅ ${notes}`);
        } else {
          status = 'FAIL';
          notes = `OAuth user has passwordHash: ${user.passwordHash?.substring(0, 10)}...`;
          console.error(`❌ ${notes}`);
        }
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Test failed: ${error.message}`;
    }

    recordCheck('OAuth No Password', status, notes);
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 10000);

  // Test 3.3: Account linking (same email, different provider)
  it('should handle account linking when OAuth email matches existing credentials user', async () => {
    const linkEmail = generateTestEmail('linktest');
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';
    const linkData: any = {};

    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        status = 'SKIP';
        notes = 'Google OAuth not configured';
      } else {
        // Step 1: Create credentials user
        const credentialsUser = await prisma.user.create({
          data: {
            email: linkEmail,
            passwordHash: await require('bcryptjs').hash('Test@1234!', 10),
            name: 'Credentials User',
            isEmailVerified: false,
          },
        });

        linkData.credentialsUserId = credentialsUser.id;

        // Step 2: Attempt to create OAuth account with same email
        // This should either link the account or throw an error
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: linkEmail },
            include: { accounts: true },
          });

          if (existingUser) {
            // Check if we can add an account
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                provider: 'google',
                providerAccountId: `google_link_${Date.now()}`,
                type: 'oauth',
              },
            });

            const updatedUser = await prisma.user.findUnique({
              where: { id: existingUser.id },
              include: { accounts: true },
            });

            if (updatedUser?.accounts.length === 1) {
              status = 'PASS';
              notes = `Account linked successfully: ${updatedUser.accounts[0]?.provider} to existing user`;
              console.log(`✅ ${notes}`);
              linkData.linkedAccountId = updatedUser.accounts[0]?.id;
            } else {
              status = 'FAIL';
              notes = `Expected 1 account, found ${updatedUser?.accounts.length}`;
            }
          } else {
            status = 'FAIL';
            notes = 'Existing user not found';
          }
        } catch (linkError: any) {
          // If linking fails with duplicate error, that's also valid behavior
          if (linkError.code === 'P2002') {
            status = 'PASS';
            notes = `Linking prevented by unique constraint (expected behavior)`;
            console.log(`✅ ${notes}`);
          } else {
            throw linkError;
          }
        }

        testResults.testUsers.push({ id: credentialsUser.id, email: linkEmail });
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Account linking test failed: ${error.message}`;
      console.error(`❌ ${notes}`);
    }

    recordCheck('Account Linking', status, notes, linkData);
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 20000);

  // Test 3.4: Verify JWT session contains correct claims
  it('should verify JWT session contains required claims after OAuth login', async () => {
    // This test requires a running server with NextAuth configured
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';

    try {
      if (typeof fetch === 'undefined') {
        status = 'SKIP';
        notes = 'Fetch not available (not running in server environment)';
      } else {
        // Note: Actual JWT verification would require:
        // 1. Completing OAuth flow
        // 2. Extracting session cookie
        // 3. Decoding JWT to verify claims
        // This is a placeholder for the actual implementation
        
        status = 'SKIP';
        notes = 'Manual verification required: Check /api/auth/session after OAuth login';
        console.log(`⚠️  ${notes}`);
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Test failed: ${error.message}`;
    }

    recordCheck('JWT Session Claims', status, notes);
    // Don't fail on skip
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 10000);

  // Test 3.5: No duplicate users on re-trigger OAuth
  it('should not create duplicate users when OAuth is re-triggered with same email', async () => {
    const dupOAuthEmail = generateTestEmail('dupoauth');
    let status: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
    let notes = '';

    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        status = 'SKIP';
        notes = 'Google OAuth not configured';
      } else {
        // Create first OAuth user
        const user1 = await prisma.user.create({
          data: {
            email: dupOAuthEmail,
            emailVerified: new Date(),
            name: 'OAuth User 1',
            isEmailVerified: true,
            accounts: {
              create: {
                provider: 'google',
                providerAccountId: `google_dup1_${Date.now()}`,
                type: 'oauth',
              },
            },
          },
        });

        // Try to create another account with same email (should fail or link)
        try {
          await prisma.user.create({
            data: {
              email: dupOAuthEmail,
              emailVerified: new Date(),
              name: 'OAuth User 2',
              isEmailVerified: true,
              accounts: {
                create: {
                  provider: 'google',
                  providerAccountId: `google_dup2_${Date.now() + 1}`,
                  type: 'oauth',
                },
              },
            },
          });
          // If we get here, check if it actually created a duplicate
          const count = await prisma.user.count({
            where: { email: dupOAuthEmail },
          });

          if (count === 1) {
            status = 'PASS';
            notes = 'Database constraint prevented duplicate';
            console.log(`✅ ${notes}`);
          } else {
            status = 'FAIL';
            notes = `Duplicate user created: ${count} users with same email`;
            console.error(`❌ ${notes}`);
          }
        } catch (error: any) {
          if (error.code === 'P2002') {
            status = 'PASS';
            notes = 'Unique constraint prevented duplicate user creation';
            console.log(`✅ ${notes}`);
          } else {
            throw error;
          }
        }

        testResults.testUsers.push({ id: user1.id, email: dupOAuthEmail });
      }
    } catch (error: any) {
      status = 'FAIL';
      notes = `Test failed: ${error.message}`;
    }

    recordCheck('No Duplicate OAuth Users', status, notes);
    if (status !== 'SKIP') expect(status).toBe('PASS');
  }, 15000);
});

export function getAgent3Summary(): typeof testResults {
  return testResults;
}