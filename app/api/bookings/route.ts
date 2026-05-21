import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const userId = session.user.id;
    const userRole = (session.user as any).role;

    let where: any = {};

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

    const bookings = await prisma.booking.findMany({
      where,
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
    });

    return NextResponse.json({ bookings });
  } catch (error: any) {
    console.error('List bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to list bookings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employeeId, scheduledAt, durationMins = 15, topic, notes, amountPaid = 0 } = body;

    if (!employeeId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeId, scheduledAt' },
        { status: 400 }
      );
    }

    // Fetch user with profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentProfile: true,
        parentProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
        { error: 'User role not allowed to book or profile incomplete' },
        { status: 403 }
      );
    }

    // Parse scheduledAt
    const scheduledAtDate = new Date(scheduledAt);
    if (isNaN(scheduledAtDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledAt format (use ISO string)' },
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

      return NextResponse.json({ booking }, { status: 201 });
    } catch (error: any) {
      // Unique constraint violation (double booking)
      if (error.code === 'P2002' || error.meta?.target?.includes('employeeId_scheduledAt')) {
        return NextResponse.json(
          { error: 'Selected time slot is already booked' },
          { status: 409 }
        );
      }
      console.error('Create booking error:', error);
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
