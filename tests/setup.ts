/**
 * Global Jest Setup
 * Runs before all tests
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function setup(): Promise<void> {
  console.log('\n🧪 Setting up test environment...');

  // Verify database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    throw new Error('Database connection required for tests');
  }

  // Clean up any leftover test data from previous runs
  try {
    const cleanup = await cleanupTestUsers();
    console.log(`✅ Cleaned up: ${cleanup.deletedUsers} users, ${cleanup.deletedAccounts} accounts, ${cleanup.deletedSessions} sessions`);
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error);
  }
}

export async function teardown(): Promise<void> {
  console.log('\n🧹 Cleaning up test environment...');
  
  try {
    const cleanup = await cleanupTestUsers();
    console.log(`✅ Final cleanup: ${cleanup.deletedUsers} users, ${cleanup.deletedAccounts} accounts, ${cleanup.deletedSessions} sessions deleted`);
  } catch (error) {
    console.warn('⚠️  Final cleanup warning:', error);
  }

  await prisma.$disconnect();
  console.log('✅ Test environment torn down\n');
}

/**
 * Clean up test users
 */
async function cleanupTestUsers(emailPattern: string = 'testuser_'): Promise<{
  deletedUsers: number;
  deletedAccounts: number;
  deletedSessions: number;
}> {
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        email: { contains: emailPattern },
      },
      select: { id: true },
    });

    const userIds = testUsers.map((u) => u.id);

    if (userIds.length === 0) {
      return { deletedUsers: 0, deletedAccounts: 0, deletedSessions: 0 };
    }

    const accountsCount = await prisma.account.count({
      where: { userId: { in: userIds } },
    });

    const sessionsCount = await prisma.session.count({
      where: { userId: { in: userIds } },
    });

    await prisma.user.deleteMany({
      where: { email: { contains: emailPattern } },
    });

    return {
      deletedUsers: userIds.length,
      deletedAccounts: accountsCount,
      deletedSessions: sessionsCount,
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

// Export for use in test files
export { cleanupTestUsers };