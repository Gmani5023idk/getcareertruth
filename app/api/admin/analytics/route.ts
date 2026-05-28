import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { captureError } from '@/lib/sentry-server';
import { authorizeRoute } from '@/lib/auth-utils';

/**
 * GET /api/admin/analytics
 *
 * Platform-level analytics: signups, revenue, sessions, active mentors.
 * Auth: ADMIN only.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { searchParams } = req.nextUrl;
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Parallel DB queries — all aggregates in a single transaction
    const [
      totalUsers,
      newUsers,
      totalBookings,
      completedBookings,
      totalRevenue,
      revenueByDay,
      activeMentors,
      pendingBookings,
      disputeCount,
      openDisputes,
    ] = await prisma.$transaction([
      // Total users
      prisma.user.count(),

      // New signups in period
      prisma.user.count({ where: { createdAt: { gte: since } } }),

      // Total bookings
      prisma.booking.count(),

      // Completed bookings in period
      prisma.booking.count({ where: { status: 'COMPLETED', createdAt: { gte: since } } }),

      // Total revenue (completed bookings with successful payment)
      prisma.booking.aggregate({
        where: { status: 'COMPLETED', razorpayPaymentId: { not: null } },
        _sum: { amountPaid: true },
      }),

      // Revenue by day (last N days)
      prisma.booking.groupBy({
        by: ['createdAt'],
        _sum: { amountPaid: true },
        where: {
          status: 'COMPLETED',
          razorpayPaymentId: { not: null },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Active mentors (mentors with completed sessions this month)
      prisma.booking.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Pending booking requests
      prisma.booking.count({ where: { status: 'PENDING_CONFIRM' } }),

      // Disputes count
      prisma.booking.count({ where: { disputeStatus: { not: 'NONE' } } }),

      // Open disputes
      prisma.booking.count({ where: { disputeStatus: 'OPEN' } }),
    ]);

    // Compute daily revenue series
    const dailyRevenue: { date: string; amount: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayTotal = revenueByDay
        .filter((r) => r.createdAt.toISOString().slice(0, 10) === dateStr)
        .reduce((sum, r) => sum + (r._sum?.amountPaid ?? 0), 0);
      dailyRevenue.unshift({ date: dateStr, amount: dayTotal });
    }

    return NextResponse.json({
      totalUsers,
      newUsers,
      totalBookings,
      completedSessions: completedBookings,
      totalRevenue: totalRevenue._sum.amountPaid ?? 0,
      revenueByDay: dailyRevenue,
      activeMentors,
      pendingBookings,
      disputeCount,
      openDisputes,
      periodDays: days,
    });
  } catch (error) {
    const msg = captureError(error, 'GET /api/admin/analytics');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}