import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { captureError } from '@/lib/sentry-server';
import { authorizeRoute } from '@/lib/auth-utils';

/**
 * GET /api/admin/reviews
 *
 * List all reviews for admin moderation with pagination.
 * Auth: ADMIN only.
 *
 * Query params:
 *   page, limit
 *   status — 'pending' | 'approved' | 'all' (default: 'pending')
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') || 'pending';

    const where: Record<string, unknown> = {};
    if (status === 'pending') where.isPublic = false;
    else if (status === 'approved') where.isPublic = true;

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              topic: true,
              scheduledAt: true,
              student: { include: { studentProfile: { select: { fullName: true } } } },
              parent: { include: { parentProfile: { select: { fullName: true } } } },
              employee: {
                include: { employeeProfile: { select: { fullName: true, company: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.review.count({ where }),
    ]);

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      isPublic: r.isPublic,
      createdAt: r.createdAt,
      employeeName: r.booking.employee.employeeProfile?.fullName || 'Unknown',
      employeeCompany: r.booking.employee.employeeProfile?.company || '',
      reviewerName:
        r.booking.student?.studentProfile?.fullName ||
        r.booking.parent?.parentProfile?.fullName ||
        'Anonymous',
      topic: r.booking.topic || '',
      bookingId: r.booking.id,
    }));

    return NextResponse.json({
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const msg = captureError(error, 'GET /api/admin/reviews');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}