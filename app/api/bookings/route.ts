import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, success, type HandlerSession } from '@/lib/api-handler';
import { bookingSchema } from '@/shared/schemas/auth.schema';

/** GET /api/bookings — List bookings for the authenticated user (role-aware) */
export const GET = apiHandler({
  requireAuth: true,
  handler: async ({ req, session }) => {
    // session is guaranteed non-null when requireAuth: true
    const user = session as HandlerSession;

    // Parse pagination params with safe defaults and bounds
    const rawPage = req.nextUrl.searchParams.get('page');
    const rawLimit = req.nextUrl.searchParams.get('limit');
    const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? '20', 10) || 20));
    const skip = (page - 1) * limit;

    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const userId = user.user.id;
    const userRole = user.user.role;

    const where: Record<string, unknown> = {};

    // Filter by user role and ID
    if (userRole === 'EMPLOYEE') {
      where.employeeId = userId;
    } else if (userRole === 'STUDENT') {
      where.studentId = userId;
    } else if (userRole === 'PARENT') {
      where.parentId = userId;
    }

    // Additional status filter
    if (status) {
      where.status = status;
    }

    let bookings: Awaited<ReturnType<typeof prisma.booking.findMany>> = [];
    let total = 0;

    try {
      [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          skip,
          take: limit,
          include: {
            employee: {
              include: {
                employeeProfile: {
                  select: {
                    fullName: true,
                    jobTitle: true,
                    company: true,
                  },
                },
              },
            },
            student: {
              include: {
                studentProfile: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            parent: {
              include: {
                parentProfile: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            scheduledAt: 'desc',
          },
        }),
        prisma.booking.count({ where }),
      ]);
    } catch (err) {
      // Prisma errors are handled by apiHandler's catch-all,
      // but we log here for extra context
      console.error('[GET /api/bookings] Prisma error:', err);
      throw err;
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        data: { bookings },
        pagination: { page, limit, total, totalPages },
      },
      {
        headers: {
          // Cache privately (user-specific data) for 10 seconds;
          // stale-while-revalidate lets clients serve while fetching fresh data
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        },
      }
    );
  },
});

/** POST /api/bookings — Create a new booking (student/parent only) */
export const POST = apiHandler({
  requireAuth: true,
  schema: bookingSchema,
  handler: async ({ body, session }) => {
    const sess = session as import('@/lib/api-handler').HandlerSession;
    const { employeeId, scheduledAt, topic, durationMins, notes, amountPaid } = body;

    // Fetch user with profile
    const user = await prisma.user.findUnique({
      where: { id: sess.user.id },
      include: {
        studentProfile: true,
        parentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Determine studentId or parentId based on role
    let studentId: string | null = null;
    let parentId: string | null = null;

    if (user.role === 'STUDENT' && user.studentProfile) {
      studentId = user.id;
    } else if (user.role === 'PARENT' && user.parentProfile) {
      parentId = user.id;
    } else {
      return NextResponse.json(
        { success: false, error: 'User role not allowed to book or profile incomplete', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse scheduledAt
    const scheduledAtDate = new Date(scheduledAt);
    if (isNaN(scheduledAtDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduledAt format (use ISO string)', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create booking
    try {
      const booking = await prisma.booking.create({
        data: {
          studentId,
          parentId,
          employeeId,
          scheduledAt: scheduledAtDate,
          durationMins,
          topic,
          notes,
          amountPaid,
          status: 'PENDING_CONFIRM',
        },
      });

      return success({ booking }, 201);
    } catch (error) {
      // Unique constraint violation (double booking)
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      if (
        prismaError.code === 'P2002' ||
        prismaError.meta?.target?.includes('employeeId_scheduledAt')
      ) {
        return NextResponse.json(
          { success: false, error: 'Selected time slot is already booked', code: 'CONFLICT' },
          { status: 409 }
        );
      }
      throw error; // Let apiHandler catch-all handle the rest
    }
  },
});
