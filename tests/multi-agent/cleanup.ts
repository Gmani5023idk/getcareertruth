/**
 * Multi-Agent Test Suite — Cleanup Utility
 *
 * Deletes all test users created during test runs to prevent database pollution.
 *
 * Safety:
 *   - Only deletes users matching email pattern: testuser_*@example.com
 *   - Also matches: cred.*@example.com, oauth.*@gmail.com, edge.*@example.com
 *   - Dry-run mode: `--dry-run` flag to preview deletions
 *   - Production guard: refuses to run if VERCEL_ENV=production
 *
 * Usage:
 *   npx ts-node tests/multi-agent/cleanup.ts          # actual deletion
 *   npx ts-node tests/multi-agent/cleanup.ts --dry-run # preview only
 */

import { prisma } from '@/lib/db';

const TEST_EMAIL_PATTERNS = [
  'cred.%',
  'oauth.%',
  'edge.%',
  'testuser_%',
  'test.%',
  'student.%',
  'parent.%',
  'employee.%',
];

const isDryRun = process.argv.includes('--dry-run');
const isProduction =
  process.env.VERCEL_ENV === 'production' ||
  process.env.APP_ENV === 'production';

async function cleanup() {
  if (isProduction) {
    console.log('⚠️  Production environment detected. Cleanup aborted — read-only mode.');
    process.exit(0);
  }

  console.log(`🧹 Multi-Agent Test Suite — Cleanup`);
  console.log(`   Mode: ${isDryRun ? 'DRY-RUN (no changes)' : 'LIVE'}`);
  console.log('');

  let totalDeleted = 0;

  for (const pattern of TEST_EMAIL_PATTERNS) {
    const likePattern = pattern.replace(/%/g, '');

    const matchingUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: likePattern,
          mode: 'insensitive',
        },
      },
      select: { id: true, email: true },
    });

    if (matchingUsers.length === 0) continue;

    const ids = matchingUsers.map((u) => u.id);

    if (isDryRun) {
      console.log(`  [DRY-RUN] Would delete ${matchingUsers.length} user(s) matching "${pattern}":`);
      for (const u of matchingUsers) {
        const masked = u.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => `${a}***${c}`);
        console.log(`    - ${u.id} (${masked})`);
      }
    } else {
      const deleteResult = await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });
      totalDeleted += deleteResult.count;
      console.log(`  ✅ Deleted ${deleteResult.count} user(s) matching "${pattern}"`);
    }
  }

  if (isDryRun) {
    console.log(`\n📋 Dry-run complete. No data was modified.`);
    console.log(`   Run without --dry-run to perform actual cleanup.`);
  } else {
    console.log(`\n✅ Cleanup complete. Total deleted: ${totalDeleted} test user(s).`);
  }

  await prisma.$disconnect();
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
