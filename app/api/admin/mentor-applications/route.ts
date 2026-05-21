import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const applications = await prisma.mentorApplication.findMany({
      where: {
        status: 'PENDING_ADMIN_REVIEW',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error('Fetch mentor applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
