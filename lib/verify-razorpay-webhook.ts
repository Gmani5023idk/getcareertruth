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
 *
 * SEC: Fail-closed — throws on DB failure so the caller returns 503.
 * Razorpay retries webhook delivery automatically (up to 24h with backoff),
 * so a delayed confirmation during a DB outage is far safer than duplicate
 * payment processing, double Zoom meetings, or double billing.
 */
export async function isWebhookEventProcessed(
  eventId: string,
  provider: string
): Promise<boolean> {
  const { prisma } = await import('@/lib/db');
  const existing = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });
  return !!existing;
}

/**
 * Mark a webhook event as processed (idempotency).
 *
 * SEC: Fail-closed — throws on DB failure so the caller returns 503.
 */
export async function markWebhookEventProcessed(
  eventId: string,
  provider: string
): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.webhookEvent.create({
    data: {
      id: eventId,
      provider,
    },
  });
}
