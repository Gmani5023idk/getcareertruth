import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, success } from '@/lib/api-handler';
import { reviewSchema } from '@/shared/schemas/auth.schema';
import { getOrSet, invalidate } from '@/lib/cache';

/** GET /api/reviews — List public reviews with pagination */
export const GET = apiHandler({
  handler: async ({ req }) => {
    const { searchParams } = req.nextUrl;
    const employeeId = searchParams.get('employeeId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }

    // Use getOrSet for cache-aside pattern
    const result = await getOrSet(
      `reviews:employee:${employeeId}:page${page}`,
      async () => {
        const [reviews, total] = await prisma.$transaction([
          prisma.review.findMany({
            where: { employeeId, isPublic: true },
            include: {
              booking: {
                select: {
                  id: true,
                  scheduledAt: true,
                  student: {
                    include: { studentProfile: { select: { fullName: true } } },
                  },
                  parent: {
                    include: { parentProfile: { select: { fullName: true } } },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip,
          }),
          prisma.review.count({ where: { employeeId, isPublic: true } }),
        ]);

        const formatted = reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          text: r.text,
          isPublic: r.isPublic,
          createdAt: r.createdAt,
          reviewerName:
            r.booking.student?.studentProfile?.fullName ||
            r.booking.parent?.parentProfile?.fullName ||
            'Anonymous',
        }));

        return { data: formatted, total };
      },
      300_000, // 5 min TTL
    );

    return success({ ...result, page, limit, hasNextPage: page * limit < result.total });
  },
});

/** POST /api/reviews — Submit a review for a completed booking */
export const POST = apiHandler({
  requireAuth: true,
  schema: reviewSchema,
  handler: async ({ body, session }) => {
    const sess = session as import('@/lib/api-handler').HandlerSession;
    const { bookingId, rating, text, isPublic = true } = body as typeof body & { isPublic?: boolean };

    // Fetch the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        employee: {
          include: {
            employeeProfile: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Security: Check if booking belongs to user
    const isStudent = booking.studentId === sess.user.id;
    const isParent = booking.parentId === sess.user.id;
    if (!isStudent && !isParent) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Check if status is COMPLETED
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Can only review completed sessions', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { bookingId },
    });
    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review already submitted for this session', code: 'CONFLICT' },
        { status: 409 }
      );
    }

    const employeeProfileId = booking.employee.employeeProfile?.id;
    if (!employeeProfileId) {
      return NextResponse.json(
        { success: false, error: 'Employee profile not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

// Create review
    const review = await prisma.review.create({
      data: {
        bookingId,
        employeeId: employeeProfileId,
        rating,
        text,
        isPublic: isPublic ?? true,
      },
    });

    // Update employee stats using DB aggregation — no N+1 query
    const agg = await prisma.review.aggregate({
      where: { employeeId: employeeProfileId },
      _count: true,
      _avg: { rating: true },
    });

    await prisma.employeeProfile.update({
      where: { id: employeeProfileId },
      data: {
        rating: agg._avg.rating ?? 0,
        totalCalls: { increment: 1 },
      },
    });

    // Invalidate review cache for this employee so next read is fresh
    invalidate(`reviews:employee:${employeeProfileId}:*`);

    return success({ review }, 201);
  },
});
