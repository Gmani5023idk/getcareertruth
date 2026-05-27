/**
 * Razorpay Webhook Signature Verification
 *
 * Timing-attack-safe verification using crypto.timingSafeEqual.
 * Handles case-insensitive signature comparison.
 */

import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

/**
 * Verify a Razorpay webhook signature.
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The signature from the x-razorpay-signature header
 * @param secret - The webhook secret (defaults to RAZORPAY_WEBHOOK_SECRET env var)
 * @returns true if the signature is valid, false otherwise
 */
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string = WEBHOOK_SECRET
): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  try {
    // Compute expected HMAC-SHA256
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    // Normalise: extract hex value if prefixed with 'sha256='
    let receivedHex = signature.trim();
    if (receivedHex.startsWith('sha256=')) {
      receivedHex = receivedHex.slice(7);
    }

    // Normalise both to lowercase for case-insensitive comparison
    const expectedNormalised = expected.toLowerCase();
    const receivedNormalised = receivedHex.toLowerCase();

    // Timing-safe comparison
    const expectedBuf = Buffer.from(expectedNormalised, 'hex');
    const receivedBuf = Buffer.from(receivedNormalised, 'hex');

    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Check if a webhook event has already been processed (idempotency check).
 */
export async function isWebhookEventProcessed(
  eventId: string,
  provider: string
): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/db');
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });
    return !!existing;
  } catch (error) {
    console.error('Webhook idempotency check error:', error);
    return false; // If DB is down, allow processing (fail open)
  }
}

/**
 * Mark a webhook event as processed (idempotency).
 */
export async function markWebhookEventProcessed(
  eventId: string,
  provider: string
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        provider,
      },
    });
  } catch (error) {
    console.error('Failed to mark webhook event as processed:', error);
  }
}
