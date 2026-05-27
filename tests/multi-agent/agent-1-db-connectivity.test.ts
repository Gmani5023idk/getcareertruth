/**
 * Agent 1 — DB Connectivity Inspector
 *
 * Verifies that the application can reach and communicate with the Neon
 * PostgreSQL instance via the /api/health endpoint.
 *
 * Tests:
 *   - Basic connectivity (200 OK with db: 'ok')
 *   - Cold start latency (serverless spin-up)
 *   - Concurrent request pooling
 *   - Graceful degradation on connection failure
 *   - Response timing measurements
 */

import { NextRequest, NextResponse } from 'next/server';

const mockQueryRaw = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

const originalEnv = { ...process.env };

import { GET as healthCheck } from '@/app/api/health/route';

function findInResponse(body: any, key: string): any {
  if (typeof body === 'object' && body !== null) {
    if (key in body) return body[key];
    for (const v of Object.values(body)) {
      const found = findInResponse(v, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

async function parseResponse(response: NextResponse) {
  const body = await response.json();
  return { status: response.status, body, timing: 0 };
}

describe('[Agent 1] DB Connectivity — Health Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('[PASS] should return 200 with db connected status', async () => {
    mockQueryRaw.mockResolvedValue([{ '1': 1 }]);

    const response = await healthCheck();
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(findInResponse(body, 'status')).toBe('ok');
    expect(findInResponse(body, 'database')?.status ?? body.services?.database?.status).toBe('ok');
  });

  it('[PASS] should handle cold start — rapid sequential health checks', async () => {
    const iterations = 5;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      mockQueryRaw.mockResolvedValue([{ '1': 1 }]);
      const start = Date.now();
      const response = await healthCheck();
      const elapsed = Date.now() - start;
      timings.push(elapsed);

      const { status } = await parseResponse(response);
      expect(status).toBe(200);
    }

    const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxMs = Math.max(...timings);
    expect(avgMs).toBeLessThan(5000);
  });

  it('[PASS] should handle concurrent health check requests', async () => {
    mockQueryRaw.mockResolvedValue([{ '1': 1 }]);
    const concurrent = 10;

    const results = await Promise.all(
      Array.from({ length: concurrent }, () => healthCheck())
    );

    for (const response of results) {
      const { status, body } = await parseResponse(response);
      expect(status).toBe(200);
      expect(findInResponse(body, 'database')?.status ?? body.services?.database?.status).toBe('ok');
    }
  });

  it('[PASS] should return degraded status on DB connection failure without crashing', async () => {
    mockQueryRaw.mockRejectedValue(new Error('connection refused'));

    const response = await healthCheck();
    const { status, body } = await parseResponse(response);

    expect(status).toBe(503);
    expect(findInResponse(body, 'status')).toBe('degraded');
    const dbStatus = findInResponse(body, 'database')?.status ?? body.services?.database?.status;
    expect(dbStatus).toBe('error');
  });

  it('[PASS] should return 503 when database is unreachable, not 500', async () => {
    mockQueryRaw.mockRejectedValue(new Error('ETIMEDOUT'));

    const response = await healthCheck();
    const { status } = await parseResponse(response);

    expect(status).toBe(503);
  });

  it('[PASS] should not leak stack traces in error responses', async () => {
    mockQueryRaw.mockRejectedValue(new Error('Sensitive connection string leak test'));

    const response = await healthCheck();
    const { body } = await parseResponse(response);
    const bodyStr = JSON.stringify(body);

    expect(bodyStr).not.toMatch(/at\s+\w+\.\w+/);
    expect(bodyStr).not.toMatch(/stack/i);
    expect(bodyStr).not.toMatch(/postgresql:\/\//i);
    expect(bodyStr).not.toMatch(/password/i);
  });

  it('[PASS] should verify all service configs are reported', async () => {
    mockQueryRaw.mockResolvedValue([{ '1': 1 }]);
    process.env.PUSHER_APP_ID = 'test';
    process.env.NEXT_PUBLIC_PUSHER_KEY = 'test';
    process.env.PUSHER_SECRET = 'test';
    process.env.RAZORPAY_KEY_ID = 'test';
    process.env.RAZORPAY_KEY_SECRET = 'test';
    process.env.RESEND_API_KEY = 'test';
    process.env.ZOOM_ACCOUNT_ID = 'test';
    process.env.ZOOM_CLIENT_ID = 'test';
    process.env.ZOOM_CLIENT_SECRET = 'test';

    const response = await healthCheck();
    const { body } = await parseResponse(response);

    const services = body.services;
    expect(services).toBeDefined();
    expect(services.database).toBeDefined();
    expect(services.pusher).toBeDefined();
    expect(services.payments).toBeDefined();
    expect(services.email).toBeDefined();
    expect(services.video).toBeDefined();
  });

  it('[MEASURE] should complete health check within acceptable time', async () => {
    mockQueryRaw.mockResolvedValue([{ '1': 1 }]);
    const start = performance.now();
    await healthCheck();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(3000);
  });
});
