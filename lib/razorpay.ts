/**
 * Razorpay client utilities.
 *
 * Environment variables:
 * - RAZORPAY_KEY_ID
 * - RAZORPAY_KEY_SECRET
 */

import crypto from 'crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID!;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

/**
 * Convert rupees to paise (Razorpay amount is in smallest currency unit).
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Create a Razorpay order.
 */
export async function createRazorpayOrder(options: {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Razorpay order creation failed: ${response.status} ${err}`);
  }

  return response.json(); // { id, amount, currency, ... }
}

/**
 * Verify Razorpay payment signature (client-side verification for verify route).
 * This is used to confirm that the payment was made for the given order.
 */
export function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body)
    .digest('base64');
  // Use timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
}

/**
 * Verify Razorpay webhook signature.
 * Used to authenticate incoming webhook requests from Razorpay.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  // signature header is like a hex string, e.g., 'sha256=abcdef...'
  const expected = crypto.createHmac('sha256', KEY_SECRET).update(payload).digest('hex');
  // Compare the hex string directly (after stripping any prefix like 'sha256=')
  const received = signature.trim();
  const receivedHex = received.startsWith('sha256=') ? received.slice(7) : received;
  // Timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedHex));
}

/**
 * Create a Razorpay payout to a mentor.
 * Note: Payouts require RazorpayX to be enabled and an active balance in your account.
 */
export async function createRazorpayPayout(options: {
  account_number: string; // RazorpayX account number (your business account)
  fund_account_id: string; // ID of the contact's fund account (mentor's bank/upi)
  amount: number; // in paise
  currency: string;
  mode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI';
  purpose: 'payout' | 'refund' | 'cashback';
  queue_if_low_balance?: boolean;
  reference_id?: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; status: string }> {
  const response = await fetch('https://api.razorpay.com/v1/payouts', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Razorpay payout failed: ${response.status} ${err}`);
  }

  return response.json();
}
