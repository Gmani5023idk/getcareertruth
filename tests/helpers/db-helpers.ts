/**
 * Test Helpers - Database and API utilities
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix = 'testuser'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@example.com`;
}

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Check if database is connectable
 */
export async function checkDatabaseConnection(): Promise<{
  status: 'ok' | 'error';
  message?: string;
  latency?: number;
}> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    return { status: 'ok', latency };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
}

/**
 * Clean up test users
 */
export async function cleanupTestUsers(emailPattern: string = 'testuser_%'): Promise<{
  deletedUsers: number;
  deletedAccounts: number;
  deletedSessions: number;
}> {
  try {
    // Get all test users matching the pattern
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: emailPattern.includes('%') ? emailPattern.replace('%', '') : emailPattern,
        },
      },
      select: { id: true },
    });

    const userIds = testUsers.map((u) => u.id);

    if (userIds.length === 0) {
      return { deletedUsers: 0, deletedAccounts: 0, deletedSessions: 0 };
    }

    // Count records to delete
    const accountsCount = await prisma.account.count({
      where: { userId: { in: userIds } },
    });

    const sessionsCount = await prisma.session.count({
      where: { userId: { in: userIds } },
    });

    // Delete cascade will handle related records
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: emailPattern.includes('%') ? emailPattern.replace('%', '') : emailPattern,
        },
      },
    });

    return {
      deletedUsers: userIds.length,
      deletedAccounts: accountsCount,
      deletedSessions: sessionsCount,
    };
  } catch (error: any) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

/**
 * Validate password hash format
 */
export function isValidPasswordHash(hash: string | null): boolean {
  if (!hash) return false;
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  return /^\$2[aby]\$/.test(hash);
}

/**
 * Mask email for reporting
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 1 ? `${local[0]}***` : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

export default {
  prisma,
  generateTestEmail,
  generateTestId,
  checkDatabaseConnection,
  cleanupTestUsers,
  isValidPasswordHash,
  maskEmail,
  waitFor,
};