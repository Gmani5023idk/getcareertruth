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
    // SEC: Fail-closed — if DB is unreachable, return 503 so Razorpay retries.
    let alreadyProcessed: boolean;
    try {
      alreadyProcessed = await isWebhookEventProcessed(eventId, 'razorpay');
    } catch (dbError) {
      console.error('Webhook idempotency check failed (DB unavailable):', dbError);
      await auditLog({
        action: AuditAction.WEBHOOK_FAILED,
        entity: 'RazorpayWebhook',
        entityId: eventId,
        metadata: { error: 'Idempotency check failed — DB unavailable', detail: (dbError as Error).message },
        success: false,
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Service temporarily unavailable — please retry' },
        { status: 503 }
      );
    }
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
    const paidAmount = payment.amount; // Razorpay sends amount in paise

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

    // Verify the paid amount matches the expected amount (paise)
    const expectedPaise = booking.amountPaid * 100;
    if (paidAmount !== expectedPaise) {
      await auditLog({
        action: AuditAction.WEBHOOK_FAILED,
        entity: 'RazorpayWebhook',
        entityId: eventId,
        metadata: { error: 'Amount mismatch', orderId, expected: expectedPaise, received: paidAmount },
        success: false,
      });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
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

    // Post-payment actions: Zoom meeting (tracks meetingStatus), conversation, emails
    void processConfirmedBooking(booking.id).catch((postError) => {
      // processConfirmedBooking handles its own errors internally (meetingStatus: FAILED, etc.).
      // This catch is a safety net for unexpected errors (e.g., DB connection failure).
      console.error('Webhook post-actions failed:', postError);
      auditLog({
        action: AuditAction.WEBHOOK_FAILED,
        entity: 'Booking',
        entityId: booking.id,
        metadata: { error: 'Post-payment actions failed', detail: (postError as Error).message },
        success: false,
      }).catch(() => {});
    });

    // Mark event as processed for idempotency
    // SEC: Fail-closed — if marking fails, return 503 to prevent duplicate processing
    try {
      await markWebhookEventProcessed(eventId, 'razorpay');
    } catch (markError) {
      console.error('Failed to mark webhook as processed (DB unavailable):', markError);
      await auditLog({
        action: AuditAction.WEBHOOK_FAILED,
        entity: 'RazorpayWebhook',
        entityId: eventId,
        metadata: { error: 'Failed to mark processed — DB unavailable', detail: (markError as Error).message },
        success: false,
      }).catch(() => {});
      return NextResponse.json(
        { error: 'Service temporarily unavailable — please retry' },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    await auditLog({
      action: AuditAction.WEBHOOK_FAILED,
      entity: 'RazorpayWebhook',
      metadata: { error: (error as Error).message },
      success: false,
    }).catch(() => {});
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
