import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpayWebhook, isWebhookEventProcessed, markWebhookEventProcessed } from '@/lib/verify-razorpay-webhook';
import { prisma } from '@/lib/db';
import { processConfirmedBooking } from '@/lib/bookings';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    // Read raw body as text BEFORE any JSON parsing
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('X-Razorpay-Signature') || '';

    // Verify webhook signature using timing-safe comparison
    if (!signature || !verifyRazorpayWebhook(rawBody, signature)) {
      await auditLog({
        action: AuditAction.WEBHOOK_FAILED,
        entity: 'RazorpayWebhook',
        metadata: { reason: 'Invalid signature' },
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        success: false,
      });
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // Parse the event
    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.event;

    // Audit log for webhook received
    await auditLog({
      action: AuditAction.WEBHOOK_RECEIVED,
      entity: 'RazorpayWebhook',
      entityId: eventId,
      metadata: { eventType },
      success: true,
    });

    // Idempotency check: prevent duplicate processing
    const alreadyProcessed = await isWebhookEventProcessed(eventId, 'razorpay');
    if (alreadyProcessed) {
      return NextResponse.json({ status: 'already_processed' });
    }

    if (eventType !== 'payment.captured') {
      // Mark as processed even for ignored events to avoid re-processing
      await markWebhookEventProcessed(eventId, 'razorpay');
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
      await auditLog({
        action: AuditAction.WEBHOOK_FAILED,
        entity: 'RazorpayWebhook',
        entityId: eventId,
        metadata: { error: 'Booking not found for order', orderId },
        success: false,
      });
      return NextResponse.json({ error: 'Booking not found for order' }, { status: 404 });
    }

    // If already confirmed, skip
    if (booking.status === 'CONFIRMED') {
      // Still mark as processed
      await markWebhookEventProcessed(eventId, 'razorpay');
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

    // Audit log for payment success
    await auditLog({
      action: AuditAction.PAYMENT_SUCCESS,
      entity: 'Booking',
      entityId: booking.id,
      metadata: { paymentId, orderId, amount: booking.amountPaid },
      success: true,
    });

    // Post-payment actions: Zoom meeting, conversation, emails
    try {
      await processConfirmedBooking(booking.id);
    } catch (postError) {
      console.error('Webhook post-actions failed:', postError);
    }

    // Mark event as processed for idempotency
    await markWebhookEventProcessed(eventId, 'razorpay');

    return NextResponse.json({ status: 'processed' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    await auditLog({
      action: AuditAction.WEBHOOK_FAILED,
      entity: 'RazorpayWebhook',
      metadata: { error: error.message },
      success: false,
    }).catch(() => {});
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
