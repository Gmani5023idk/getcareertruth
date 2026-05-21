import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { prisma } from '@/lib/db';
import { processConfirmedBooking } from '@/lib/bookings';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('X-Razorpay-Signature') || '';

    if (!signature || !verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { event: eventType } = event;

    if (eventType !== 'payment.captured') {
      // Ignore other events
      return NextResponse.json({ status: 'ignored' });
    }

    const payment = event.payload.payment.entity;
    const paymentId = payment.id;
    const orderId = payment.order_id;

    // Find booking by order ID
    const booking = await prisma.booking.findFirst({
      where: { razorpayOrderId: orderId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found for order' }, { status: 404 });
    }

    // If already confirmed, skip
    if (booking.status === 'CONFIRMED') {
      return NextResponse.json({ status: 'already_confirmed' });
    }

    // Update to CONFIRMED and store payment ID if not set
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        razorpayPaymentId: paymentId,
      },
    });

    // Post-payment actions: Zoom meeting, conversation, emails
    try {
      await processConfirmedBooking(booking.id);
    } catch (postError) {
      console.error('Webhook post-actions failed:', postError);
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
