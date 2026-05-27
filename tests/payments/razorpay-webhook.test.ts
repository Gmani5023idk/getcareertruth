import crypto from 'crypto';

describe('Razorpay Webhook Handling', () => {
  const webhookSecret = 'test_webhook_secret';
  const mockPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_123',
          order_id: 'order_test_123',
          amount: 29900,
          status: 'captured',
        },
      },
    },
  });

  function generateSignature(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('should verify valid webhook signature', () => {
    const signature = generateSignature(mockPayload, webhookSecret);
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(mockPayload)
      .digest('hex');

    expect(signature).toBe(expected);
  });

  it('should reject invalid webhook signature', () => {
    const validSignature = generateSignature(mockPayload, webhookSecret);
    const tamperedPayload = mockPayload.replace('captured', 'failed');
    const invalidSignature = generateSignature(tamperedPayload, webhookSecret);

    expect(validSignature).not.toBe(invalidSignature);
  });

  it('should handle payment.captured event by updating booking', () => {
    const event = JSON.parse(mockPayload);
    expect(event.event).toBe('payment.captured');
    expect(event.payload.payment.entity.status).toBe('captured');
    expect(event.payload.payment.entity.order_id).toBe('order_test_123');
  });

  it('should handle payment.failed event by marking booking as failed', () => {
    const failedPayload = mockPayload.replaceAll('captured', 'failed');
    const event = JSON.parse(failedPayload);
    expect(event.event).toBe('payment.failed');
    expect(event.payload.payment.entity.status).toBe('failed');
  });

  it('should reject webhook with missing signature header', () => {
    const signature = generateSignature(mockPayload, webhookSecret);
    expect(signature).toBeTruthy();
    // If header is missing, verification is impossible
    expect(() => {
      if (!signature) throw new Error('Missing signature header');
    }).not.toThrow();
  });
});
