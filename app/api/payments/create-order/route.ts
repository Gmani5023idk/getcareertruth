import { NextRequest, NextResponse } from 'next/server';
import { createRazorpayOrder, rupeesToPaise } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkRateLimit, paymentRateLimit, extractClientIp } from '@/lib/ratelimit';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 orders per hour per user
    const rateLimitResult = await checkRateLimit(paymentRateLimit, session.user.id, 'payment-create-order');
    if (!rateLimitResult.success) {
      await auditLog({
        userId: session.user.id,
        action: AuditAction.RATE_LIMIT_HIT,
        entity: 'PaymentOrder',
        metadata: { action: 'payment-create-order' },
        success: false,
      });
      return NextResponse.json(
        { error: 'Too many payment attempts. Try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    // Fetch booking with employee details and mentor application
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        employee: {
          include: {
            employeeProfile: true,
            mentorApplications: {
              where: { status: 'APPROVED' },
              take: 1,
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Authorization: only the user associated with the booking (student/parent) can initiate payment
    const userId = session.user.id as string;
    if (booking.studentId !== userId && booking.parentId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check booking status
    if (booking.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { error: 'Booking is not in pending payment status' },
        { status: 400 }
      );
    }

    // Calculate amounts
    let sessionFee = 0;
    let platformFee = 0;
    let totalAmount = 0;
    let isMentor = false;

    const mentorApp = booking.employee.mentorApplications[0];
    if (mentorApp) {
      // It's a senior student mentor
      isMentor = true;
      sessionFee = mentorApp.sessionRate;
      platformFee = Math.round(sessionFee * 0.15);
      totalAmount = sessionFee + platformFee;
    } else if (booking.employee.employeeProfile) {
      // It's a professional employee
      sessionFee = booking.employee.employeeProfile.pricePerCall;
      platformFee = 0; // Existing logic might not have platform fee for employees yet, or it's built-in
      totalAmount = sessionFee;
    } else {
      return NextResponse.json({ error: 'Mentor/Employee profile not found' }, { status: 404 });
    }

    const amountInPaise = rupeesToPaise(totalAmount);

    // Create Razorpay order
    const receipt = `booking_${booking.id}`;
    const order = await createRazorpayOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        bookingId: booking.id,
        employeeId: booking.employeeId,
        userId: userId,
        isMentor: String(isMentor),
      },
    });

    // Save order ID to booking, and store breakdown
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        razorpayOrderId: order.id,
        amountPaid: totalAmount,
        platformFee: platformFee,
        employeePayout: sessionFee,
      },
    });

    // Audit log for payment initiated
    await auditLog({
      userId: userId,
      action: AuditAction.PAYMENT_INITIATED,
      entity: 'Booking',
      entityId: booking.id,
      metadata: {
        orderId: order.id,
        amount: totalAmount,
        isMentor,
      },
      success: true,
    });

    return NextResponse.json(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        breakdown: {
          sessionFee,
          platformFee,
          total: totalAmount,
        },
        booking: {
          id: booking.id,
          topic: booking.topic,
          scheduledAt: booking.scheduledAt,
          employeeName: booking.employee.employeeProfile?.fullName || 'Mentor',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
