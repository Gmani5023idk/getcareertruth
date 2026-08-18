/**
 * Security Test: Razorpay Webhook Signature Verification
 *
 * Tests the verifyRazorpayWebhook function to ensure:
 * - Correct signature → true
 * - Wrong signature → false
 * - Case-insensitive signature → true
 * - Tampered body → false
 * - Empty inputs → false
 */

import crypto from 'crypto';

// Replicate the verification logic inlined so tests don't depend on environment
function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!rawBody || !signature || !secret) {
    return false;
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    let receivedHex = signature.trim();
    if (receivedHex.startsWith('sha256=')) {
      receivedHex = receivedHex.slice(7);
    }

    const expectedNormalised = expected.toLowerCase();
    const receivedNormalised = receivedHex.toLowerCase();

    const expectedBuf = Buffer.from(expectedNormalised, 'hex');
    const receivedBuf = Buffer.from(receivedNormalised, 'hex');

    if (expectedBuf.length !== receivedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

describe('Razorpay Webhook Signature Verification', () => {
  const WEBHOOK_SECRET = 'whsec_test_secret_12345';
  const testPayload = JSON.stringify({
    event: 'payment.captured',
    id: 'evt_test_12345',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_12345',
          order_id: 'order_test_12345',
        },
      },
    },
  });

  /**
   * Generate a valid signature using the expected algorithm
   */
  function generateValidSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  }

  it('should return true for a valid signature', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const result = verifyRazorpayWebhook(testPayload, validSig, WEBHOOK_SECRET);
    expect(result).toBe(true);
  });

  it('should return true for a valid signature with sha256= prefix', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const prefixedSig = `sha256=${validSig}`;
    const result = verifyRazorpayWebhook(testPayload, prefixedSig, WEBHOOK_SECRET);
    expect(result).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const invalidSig = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const result = verifyRazorpayWebhook(testPayload, invalidSig, WEBHOOK_SECRET);
    expect(result).toBe(false);
  });

  it('should return true for case-insensitive signature (uppercase)', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const uppercaseSig = validSig.toUpperCase();
    const result = verifyRazorpayWebhook(testPayload, uppercaseSig, WEBHOOK_SECRET);
    expect(result).toBe(true);
  });

  it('should return true for case-insensitive signature with sha256= prefix (mixed case)', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    // Mix upper and lower case
    const mixedCaseSig = 'sha256=' + validSig.substring(0, 16).toUpperCase() + validSig.substring(16);
    const result = verifyRazorpayWebhook(testPayload, mixedCaseSig, WEBHOOK_SECRET);
    expect(result).toBe(true);
  });

  it('should return false for a tampered body', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const tamperedPayload = testPayload.replace('payment.captured', 'payment.failed');
    const result = verifyRazorpayWebhook(tamperedPayload, validSig, WEBHOOK_SECRET);
    expect(result).toBe(false);
  });

  it('should return false for empty body', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const result = verifyRazorpayWebhook('', validSig, WEBHOOK_SECRET);
    expect(result).toBe(false);
  });

  it('should return false for empty signature', () => {
    const result = verifyRazorpayWebhook(testPayload, '', WEBHOOK_SECRET);
    expect(result).toBe(false);
  });

  it('should return false for empty secret', () => {
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const result = verifyRazorpayWebhook(testPayload, validSig, '');
    expect(result).toBe(false);
  });

  it('should return false for signature with wrong length', () => {
    const result = verifyRazorpayWebhook(testPayload, 'tooshort', WEBHOOK_SECRET);
    expect(result).toBe(false);
  });

  it('should return false for wrong secret', () => {
    const wrongSecret = 'whsec_wrong_secret';
    const validSig = generateValidSignature(testPayload, WEBHOOK_SECRET);
    const result = verifyRazorpayWebhook(testPayload, validSig, wrongSecret);
    expect(result).toBe(false);
  });
});
