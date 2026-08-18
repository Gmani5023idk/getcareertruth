import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;

    // Fetch user and employee profile
    const user = await prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        email: true,
        profilePhoto: true,
        role: true,
      },
    });

    if (!user || user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Compute rating stats
    const reviews = await prisma.review.findMany({
      where: { employeeId: employeeProfile.id },
      select: { rating: true },
    });
    const averageRating = reviews.length
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : 0;

    // Return public employee data
    const { ...publicProfile } = employeeProfile;

    return NextResponse.json({
      employee: {
        ...publicProfile,
        user: {
          id: user.id,
          profilePhoto: user.profilePhoto,
        },
        rating: averageRating,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}
