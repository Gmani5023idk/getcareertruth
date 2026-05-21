import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = (session.user as any).role as string;

    if (userRole !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch employee profile
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, profilePhoto: true },
        },
      },
    });

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Compute rating
    const reviews = await prisma.review.findMany({
      where: { employeeId: employeeProfile.id },
      select: { rating: true },
    });
    const averageRating = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0;
    const totalReviews = reviews.length;

    // Count stats
    const totalCalls = employeeProfile.totalCalls;
    const totalEarned = employeeProfile.totalEarned;

    // Count pending bookings
    const pendingCount = await prisma.booking.count({
      where: { employeeId: userId, status: 'PENDING_CONFIRM' },
    });

    // Count today's confirmed bookings
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    const todayBookingsCount = await prisma.booking.count({
      where: {
        employeeId: userId,
        status: 'CONFIRMED',
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
    });

    // Exclude sensitive private fields
    const {
      companyEmail,
      idDocumentUrl,
      idDocumentType,
      isCompanyEmailVerified,
      isIdVerified,
      isTeamVerified,
      verificationStatus,
      ...publicData
    } = employeeProfile;

    return NextResponse.json({
      employee: {
        ...publicData,
        user: employeeProfile.user,
        rating: averageRating,
        totalReviews,
        totalCalls,
        totalEarned,
        stats: { pendingRequests: pendingCount, todaysSessions: todayBookingsCount },
      },
    });
  } catch (error: any) {
    console.error('Get employee me error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch employee data' },
      { status: 500 }
    );
  }
}
