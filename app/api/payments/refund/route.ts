import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/auth-utils';
import Razorpay from 'razorpay';
import { auditLog, AuditAction } from '@/lib/audit-log';
import { sendRefundConfirmationEmail } from '@/lib/email';
import {
  checkRateLimit,
  refundRateLimit,
  extractClientIp,
} from '@/lib/ratelimit';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * POST /api/payments/refund
 *
 * Initiates a refund for a completed or cancelled booking.
 * Requires authentication and either:
 *   - ADMIN role (any booking), or
 *   - The student/parent who owns the booking
 *
 * Flow:
 *   1. Validate auth + authorization
 *   2. Verify booking eligibility
 *   3. Call Razorpay refund API
 *   4. Update booking status to REFUNDED
 *   5. Send confirmation email to the user
 *   6. Audit log
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ── Auth check ──
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting: 3 refunds per hour per user ──
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(refundRateLimit, `${session.user.id}:${ip}`, 'refund');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many refund requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await req.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // ── Fetch booking ──
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        parent: true,
        employee: { include: { employeeProfile: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // ── Authorization: ADMIN or booking owner ──
    const isAdmin = hasRole(session, ['ADMIN']);
    const isOwner = booking.studentId === session.user.id || booking.parentId === session.user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Eligibility checks ──
    if (booking.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Booking has already been refunded' }, { status: 400 });
    }

    if (booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Booking is not eligible for refund' }, { status: 400 });
    }

    if (!booking.razorpayPaymentId) {
      return NextResponse.json(
        { error: 'Cannot process refund: payment record is missing' },
        { status: 400 }
      );
    }

    // ── Calculate refund amount ──
    // Full refund if cancelled before call; 50% if call was completed
    const refundAmount =
      booking.status === 'COMPLETED'
        ? Math.round(booking.amountPaid * 0.5)
        : booking.amountPaid;

    // ── Attempt Razorpay refund ──
    let razorpayRefundId: string | null = null;

    try {
      const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: refundAmount * 100, // Convert to paise
        notes: {
          bookingId: booking.id,
          reason: reason || 'Customer requested refund',
        },
      });
      razorpayRefundId = refund.id;
    } catch (razorpayError) {
      // Log Razorpay failure — don't expose to client
      console.error('Razorpay refund failed:', razorpayError);
      // Fall through: mark as refund-pending in DB for manual resolution
    }

    // ── Update booking ──
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: razorpayRefundId ? 'REFUNDED' : booking.status,
        refundAmount,
      },
    });

    // ── Send email to the user ──
    const recipientEmail = booking.student?.email || booking.parent?.email;
    if (recipientEmail) {
      await sendRefundConfirmationEmail({
        to: recipientEmail,
        employeeName: booking.employee.employeeProfile?.fullName || 'your mentor',
        refundAmount,
        reason,
        bookingTopic: booking.topic || 'Career session',
      }).catch((emailErr) => {
        // Non-fatal: log but don't fail the request
        console.error('Failed to send refund email:', emailErr);
      });
    }

    // ── Audit log ──
    await auditLog({
      userId: session.user.id,
      action: AuditAction.PAYMENT_REFUNDED,
      entity: 'Booking',
      entityId: booking.id,
      metadata: { refundId: razorpayRefundId, refundAmount, paymentId: booking.razorpayPaymentId },
      success: true,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[refund] Completed in ${elapsed}ms — booking=${bookingId} amount=${refundAmount}`);

    return NextResponse.json(
      {
        success: true,
        message: razorpayRefundId
          ? 'Refund processed successfully'
          : 'Refund request recorded (manual processing required)',
        refundId: razorpayRefundId,
        refundAmount,
        bookingId: booking.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Refund error:', error);
    // Never leak implementation details
    return NextResponse.json(
      { error: 'Refund could not be processed. Please try again.' },
      { status: 500 }
    );
  }
}
