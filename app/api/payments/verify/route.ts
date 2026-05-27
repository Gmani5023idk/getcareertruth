import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayPayment } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { processConfirmedBooking } from '@/lib/bookings';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Authorize: user must be the booker (student/parent)
    const userId = session.user.id as string;
    if (booking.studentId !== userId && booking.parentId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify order ID matches
    if (booking.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 });
    }

    // Verify Razorpay signature
    const isValid = verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update booking to CONFIRMED and store payment ID
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // Audit log for successful payment
    await auditLog({
      userId: userId,
      action: AuditAction.PAYMENT_SUCCESS,
      entity: 'Booking',
      entityId: bookingId,
      metadata: { paymentId: razorpay_payment_id, orderId: razorpay_order_id, amount: booking.amountPaid },
      success: true,
    });

    // Post-payment actions: Zoom meeting, conversation, emails
    const { meetingLink } = await processConfirmedBooking(bookingId);

    return NextResponse.json(
      {
        message: 'Payment verified and booking confirmed',
        booking: updatedBooking,
        meetingLink,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
