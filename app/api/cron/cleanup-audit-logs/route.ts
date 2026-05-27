import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const maxDuration = 300; // 5 minutes for serverless function

/**
 * Cleanup audit logs older than 90 days.
 * Runs weekly via Vercel Cron.
 *
 * Cron schedule: 0 0 * * 0 (every Sunday at midnight)
 */
export async function GET() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Audit log cleanup: deleted ${result.count} records older than 90 days`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Audit log cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', message: error.message },
      { status: 500 }
    );
  }
}
