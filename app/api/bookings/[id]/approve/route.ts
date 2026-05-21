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

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Only the assigned employee can approve
    if (session.user.id !== booking.employeeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Must be in PENDING_CONFIRM status
    if (booking.status !== 'PENDING_CONFIRM') {
      return NextResponse.json(
        { error: 'Booking cannot be approved in current status' },
        { status: 400 }
      );
    }

    // Update to PENDING_PAYMENT
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'PENDING_PAYMENT' },
    });

    return NextResponse.json({ booking: updated });
  } catch (error: any) {
    console.error('Approve booking error:', error);
    return NextResponse.json(
      { error: 'Failed to approve booking' },
      { status: 500 }
    );
  }
}
