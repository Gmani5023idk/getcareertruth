import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const disputes = await prisma.booking.findMany({
      where: {
        disputeStatus: 'OPEN',
      },
      include: {
        employee: {
          select: {
            id: true,
            email: true,
            studentProfile: { select: { fullName: true } },
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            studentProfile: { select: { fullName: true } },
          },
        },
        parent: {
          select: {
            id: true,
            email: true,
            parentProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(disputes);
  } catch (error: any) {
    console.error('Fetch admin disputes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
