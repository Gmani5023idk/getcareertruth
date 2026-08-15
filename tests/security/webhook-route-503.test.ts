/**
 * Integration Test: Webhook Route Returns 503 on DB Failure
 * ==========================================================
 *
 * Verifies that POST /api/payments/webhook returns HTTP 503 when the
 * database is unreachable during the idempotency check (SEC-2 fix).
 *
 * This is a route-level test — it exercises the actual POST handler,
 * not just the isWebhookEventProcessed function in isolation.
 */

import { describe, it, expect, vi, afterAll } from 'vitest';

// ── Hoisted mock references ──

const mocks = vi.hoisted(() => ({
  isWebhookEventProcessed: vi.fn(),
  markWebhookEventProcessed: vi.fn(),
  auditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock webhook signature verification — always passes
// Mock idempotency functions — tests override with mockResolvedValueOnce/mockRejectedValueOnce
vi.mock('@/lib/verify-razorpay-webhook', () => ({
  verifyRazorpayWebhook: vi.fn().mockReturnValue(true),
  isWebhookEventProcessed: mocks.isWebhookEventProcessed,
  markWebhookEventProcessed: mocks.markWebhookEventProcessed,
}));

const mocksPrisma = vi.hoisted(() => ({
  bookingFindFirst: vi.fn(),
  bookingUpdate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
    booking: { findFirst: mocksPrisma.bookingFindFirst, update: mocksPrisma.bookingUpdate },
  },
}));

vi.mock('@/lib/audit-log', () => ({
  auditLog: mocks.auditLog,
  AuditAction: {
    WEBHOOK_FAILED: 'WEBHOOK_FAILED',
    WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  },
}));

vi.mock('@/lib/bookings', () => ({
  processConfirmedBooking: vi.fn().mockResolvedValue(undefined),
}));

// ── Import handler AFTER mocks ──

import { POST } from '@/app/api/payments/webhook/route';

// ── Helpers ──

function buildPayload(payload: Record<string, unknown>) {
  return JSON.stringify(payload);
}

function makeWebhookRequest(body: string): Request {
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    body,
    headers: {
      'x-razorpay-signature': 'dummy-signature-passes-mock',
      'content-type': 'application/json',
    },
  });
}

// ── Tests ──

describe('SEC-2 Route-Level: Webhook 503 on DB Failure', () => {
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('returns 503 when isWebhookEventProcessed throws (DB down)', async () => {
    // Simulate DB connection failure — idempotency check throws
    mocks.isWebhookEventProcessed.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const payload = {
      id: 'evt_db_down_test',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 50000 } } },
    };

    const body = buildPayload(payload);
    const req = makeWebhookRequest(body);

    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('temporarily unavailable');

    // Verify the idempotency check was called
    expect(mocks.isWebhookEventProcessed).toHaveBeenCalledWith('evt_db_down_test', 'razorpay');

    // Verify audit log was written for the failure
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'WEBHOOK_FAILED',
        metadata: expect.objectContaining({ error: expect.stringContaining('Idempotency check failed') }),
      })
    );
  });

  it('returns 503 when markWebhookEventProcessed throws (DB down after processing)', async () => {
    // Idempotency check succeeds (not yet processed)
    mocks.isWebhookEventProcessed.mockResolvedValueOnce(false);
    // Booking exists and is not yet confirmed
    mocksPrisma.bookingFindFirst.mockResolvedValueOnce({
      id: 'booking-2',
      status: 'PENDING',
      amountPaid: 500,
      razorpayOrderId: 'order_2',
    });
    mocksPrisma.bookingUpdate.mockResolvedValueOnce({});
    // Mark as processed fails (DB down)
    mocks.markWebhookEventProcessed.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const payload = {
      id: 'evt_mark_fail_test',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_2', order_id: 'order_2', amount: 50000 } } },
    };

    const body = buildPayload(payload);
    const req = makeWebhookRequest(body);

    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('temporarily unavailable');
  });

  it('returns 200 when DB is healthy (baseline — confirms mocks work)', async () => {
    // All operations succeed
    mocks.isWebhookEventProcessed.mockResolvedValueOnce(false);
    mocks.markWebhookEventProcessed.mockResolvedValueOnce(undefined);

    const payload = {
      id: 'evt_baseline_ok',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_baseline', order_id: 'order_baseline', amount: 50000 } } },
    };

    const body = buildPayload(payload);
    const req = makeWebhookRequest(body);

    const res = await POST(req);

    // Should NOT be 503 — everything is healthy
    expect(res.status).not.toBe(503);
  });
});
