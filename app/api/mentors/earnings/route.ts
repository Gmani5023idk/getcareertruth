import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        employeeId: session.user.id,
        status: 'COMPLETED',
      },
      include: {
        student: {
          select: {
            studentProfile: {
              select: { fullName: true },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });

    const totalEarned = bookings
      .filter(b => b.payoutStatus === 'PAID')
      .reduce((sum, b) => sum + (b.employeePayout || 0), 0);

    const pendingPayout = bookings
      .filter(b => b.payoutStatus === 'PENDING' || b.payoutStatus === 'PROCESSING')
      .reduce((sum, b) => sum + (b.employeePayout || 0), 0);

    const sessionsDone = bookings.length;

    return NextResponse.json({
      summary: {
        totalEarned,
        pendingPayout,
        sessionsDone,
      },
      bookings: bookings.map(b => ({
        id: b.id,
        date: b.scheduledAt,
        studentName: b.student?.studentProfile?.fullName || 'Anonymous',
        amount: b.employeePayout,
        status: b.payoutStatus,
        disputeStatus: b.disputeStatus,
      })),
    });
  } catch (error: any) {
    console.error('Fetch earnings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
