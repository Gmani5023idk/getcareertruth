import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { captureError } from '@/lib/sentry-server';
import { authorizeRoute } from '@/lib/auth-utils';
import { sendRefundConfirmationEmail } from '@/lib/email';

/**
 * GET /api/admin/refunds
 *
 * List all bookings that have been refunded (status=REFUNDED or
 * status=CANCELLED with refundAmount set).
 * Auth: ADMIN only.
 *
 * Query params:
 *   page, limit
 *   status — 'refunded' | 'cancelled' | 'all' (default: 'refunded')
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
    const status = searchParams.get('status') || 'refunded';

    // Build where clause: bookings with a refund recorded
    const where: Record<string, unknown> = {
      refundAmount: { not: null },
      // Only bookings that had a payment attempt (have razorpayPaymentId)
      razorpayPaymentId: { not: null },
    };

    if (status === 'refunded') {
      where.status = 'REFUNDED';
    } else if (status === 'cancelled') {
      where.status = 'CANCELLED';
    }

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          student: { include: { studentProfile: { select: { fullName: true } } } },
          parent: { include: { parentProfile: { select: { fullName: true } } } },
          employee: { include: { employeeProfile: { select: { fullName: true, companyEmail: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.booking.count({ where }),
    ]);

    const formatted = bookings.map((b) => ({
      id: b.id,
      amount: b.refundAmount,
      status: b.status,
      reason: null,
      initiatedBy: 'USER', // original user-facing refund doesn't record initiator
      razorpayPaymentId: b.razorpayPaymentId,
      createdAt: b.createdAt,
      completedAt: b.updatedAt,
      bookingId: b.id,
      topic: b.topic,
      customerName:
        b.student?.studentProfile?.fullName ||
        b.parent?.parentProfile?.fullName ||
        'Unknown',
      customerEmail:
        b.student?.email ||
        b.parent?.email,
      mentor: b.employee?.employeeProfile?.fullName ?? 'Unknown',
    }));

    return NextResponse.json({
      data: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const msg = captureError(error, 'GET /api/admin/refunds');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/refunds
 *
 * Admin-initiated refund: marks a booking as REFUNDED, zeroes the amount.
 * Uses the same Razorpay flow as the user-facing refund endpoint.
 * Auth: ADMIN only.
 *
 * Body: { bookingId: string, reason?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { bookingId, reason } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: { include: { studentProfile: true } },
        parent: { include: { parentProfile: true } },
        employee: { include: { employeeProfile: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Booking has already been refunded' }, { status: 400 });
    }

    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Booking is not eligible for refund' }, { status: 400 });
    }

    if (!booking.razorpayPaymentId) {
      return NextResponse.json({ error: 'Cannot process refund: payment record is missing' }, { status: 400 });
    }

    // Attempt Razorpay refund
    const refundAmount = booking.amountPaid;
    let razorpayRefundId: string | null = null;

    try {
      const Razorpay = (await import('razorpay')).default;
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const rzResponse = await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
        notes: { bookingId, reason: reason || 'Admin-initiated refund' },
      });
      razorpayRefundId = rzResponse.id;
    } catch (rzErr) {
      console.error('[admin:refunds] Razorpay refund failed:', rzErr);
    }

    // Update booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'REFUNDED',
        refundAmount,
      },
    });

    // Audit log
    const userId = session!.user.id; // narrowed — auth passed above
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_REFUNDED',
        entity: 'Booking',
        entityId: bookingId,
        metadata: { refundId: razorpayRefundId, refundAmount, reason },
        success: true,
      },
    });

    // Email notification
    const customerEmail =
      booking.student?.email || booking.parent?.email;
    if (customerEmail) {
      await sendRefundConfirmationEmail({
        to: customerEmail,
        employeeName: booking.employee?.employeeProfile?.fullName || 'your mentor',
        refundAmount,
        reason,
        bookingTopic: booking.topic || 'Career session',
      }).catch((e) => console.error('[admin:refunds] Email failed:', e));
    }

    return NextResponse.json({
      success: true,
      refundId: razorpayRefundId,
      refundAmount,
      bookingId,
      status: razorpayRefundId ? 'processed' : 'pending',
    });
  } catch (error) {
    const msg = captureError(error, 'POST /api/admin/refunds');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}