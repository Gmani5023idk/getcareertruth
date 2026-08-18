import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        employee: {
          include: { 
            employeeProfile: { 
              select: { 
                fullName: true,
                pricePerCall: true 
              } 
            }
          },
        },
        student: {
          include: { 
            studentProfile: { 
              select: { fullName: true } 
            } 
          },
        },
        parent: {
          include: { 
            parentProfile: { 
              select: { fullName: true } 
            } 
          },
        },
      },
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

    // Format response for the frontend
    const response = {
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      durationMins: booking.durationMins,
      topic: booking.topic,
      notes: booking.notes,
      amountPaid: booking.amountPaid || booking.employee.employeeProfile?.pricePerCall,
      meetingLink: booking.meetingLink,
      conversationId: booking.conversationId,
      cancelReason: booking.cancelReason,
      employee: {
        name: booking.employee.employeeProfile?.fullName || 'Mentor',
        avatar: booking.employee.profilePhoto,
      },
      participant: {
        name: booking.student?.studentProfile?.fullName || booking.parent?.parentProfile?.fullName || 'User',
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}
