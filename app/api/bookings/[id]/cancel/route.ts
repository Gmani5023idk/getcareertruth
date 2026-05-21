import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    
    let reason = 'Cancelled by user';
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch (e) {
      // Body might be empty
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Authorization: student, parent, or employee assigned to the booking
    const userId = session.user.id;
    if (
      userId !== booking.studentId &&
      userId !== booking.parentId &&
      userId !== booking.employeeId
    ) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Cancellation logic depends on status
    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Booking already completed or cancelled' },
        { status: 400 }
      );
    }

    // Update to CANCELLED
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
      },
    });

    // TODO: Handle refunds if status was CONFIRMED (paid)

    return NextResponse.json({ booking: updated });
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
