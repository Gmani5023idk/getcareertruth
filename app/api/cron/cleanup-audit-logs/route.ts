import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { captureError } from '@/lib/sentry-server';

export const maxDuration = 60; // 60 seconds

const CRON_NAME = 'cleanup-audit-logs';

/**
 * Cleanup audit logs older than 90 days.
 * Runs weekly via Vercel Cron (0 0 * * 0 — every Sunday midnight UTC).
 * Auth: x-admin-secret header
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[CRON:${CRON_NAME}] Starting — ${new Date().toISOString()}`);

  // Auth: prevent unauthorized trigger
  const authHeader = req.headers.get('x-admin-secret');
  if (authHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    const elapsed = Date.now() - startTime;
    console.log(`[CRON:${CRON_NAME}] Completed in ${elapsed}ms — deleted ${result.count} records older than ${cutoffDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
      durationMs: elapsed,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const userMessage = captureError(error, `CRON:${CRON_NAME}`);
    console.error(`[CRON:${CRON_NAME}] FAILED after ${elapsed}ms:`, error);
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
