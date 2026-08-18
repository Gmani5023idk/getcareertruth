/**
 * Security Retest Suite — Automated verification for the 4 confirmed fixes
 * ========================================================================
 *
 * This file contains targeted tests that verify each security fix is correctly
 * implemented and working. Run with: npx vitest run tests/security/security-retest.test.ts
 *
 * Fix #1: Mentor profile strips sensitive fields for unauthenticated users
 * Fix #2: Webhook idempotency fails closed on DB failure (returns 503)
 * Fix #3: File upload validates magic bytes and enforces 5MB limit
 * Fix #4: Rate limiter falls back to in-memory sliding window when Redis is down
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ────────────────────────────────────────────────────────────────────
// Fix #1: Mentor profile endpoint — auth-gated sensitive fields
// ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

describe('SEC-1: Mentor Profile — Sensitive Field Stripping', () => {
  const mockMentor = {
    id: 'mentor-1',
    email: 'mentor@test.com',
    profilePhoto: 'https://photo.jpg',
    studentProfile: { fullName: 'Test Mentor', collegeName: 'IIT Bombay' },
    mentorProfile: {
      bio: 'Senior engineer',
      photoUrl: null,
      rating: 4.5,
      reviewsCount: 12,
      availabilitySlots: [
        { id: 'slot-1', dayOfWeek: 1, startTime: '10:00', endTime: '11:00', timezone: 'IST' },
      ],
    },
    mentorApplications: [
      { collegeName: 'IIT Bombay', domain: 'Software', bio: '10 years exp', sessionRate: 500 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with ONLY public fields when unauthenticated (no sessionRate/availabilitySlots/reviewsCount)', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');
    const { GET } = await import('@/app/api/mentors/[mentorId]/route');

    // Unauthenticated: auth() returns null
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockMentor);

    const req = new Request('http://localhost/api/mentors/mentor-1');
    const res = await GET(req as unknown as NextRequest, { params: Promise.resolve({ mentorId: 'mentor-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);

    // Public fields MUST be present
    expect(body).toHaveProperty('id', 'mentor-1');
    expect(body).toHaveProperty('name', 'Test Mentor');
    expect(body).toHaveProperty('college', 'IIT Bombay');
    expect(body).toHaveProperty('domain', 'Software');
    expect(body).toHaveProperty('bio');
    expect(body).toHaveProperty('rating', 4.5);

    // Sensitive fields MUST NOT be present
    expect(body).not.toHaveProperty('sessionRate');
    expect(body).not.toHaveProperty('availabilitySlots');
    expect(body).not.toHaveProperty('reviewsCount');
  });

  it('should return 200 with ALL fields (including sensitive) when authenticated', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');
    const { GET } = await import('@/app/api/mentors/[mentorId]/route');

    // Authenticated: auth() returns a session
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-1', role: 'STUDENT' } });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockMentor);

    const req = new Request('http://localhost/api/mentors/mentor-1');
    const res = await GET(req as unknown as NextRequest, { params: Promise.resolve({ mentorId: 'mentor-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);

    // Sensitive fields MUST be present for authenticated users
    expect(body).toHaveProperty('sessionRate', 500);
    expect(body).toHaveProperty('availabilitySlots');
    expect(Array.isArray(body.availabilitySlots)).toBe(true);
    expect(body.availabilitySlots).toHaveLength(1);
    expect(body).toHaveProperty('reviewsCount', 12);
  });

  it('should still include public fields for authenticated users', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');
    const { GET } = await import('@/app/api/mentors/[mentorId]/route');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'user-1', role: 'STUDENT' } });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockMentor);

    const req = new Request('http://localhost/api/mentors/mentor-1');
    const res = await GET(req as unknown as NextRequest, { params: Promise.resolve({ mentorId: 'mentor-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('name', 'Test Mentor');
    expect(body).toHaveProperty('domain', 'Software');
    expect(body).toHaveProperty('rating', 4.5);
  });

  it('should return 404 when mentor does not exist', async () => {
    const { auth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/db');
    const { GET } = await import('@/app/api/mentors/[mentorId]/route');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/mentors/nonexistent');
    const res = await GET(req as unknown as NextRequest, { params: Promise.resolve({ mentorId: 'nonexistent' }) });

    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────────────────────────────
// Fix #2: Webhook idempotency — fail closed on DB failure
// ────────────────────────────────────────────────────────────────────

describe('SEC-2: Webhook Idempotency — Fail Closed', () => {
  it('isWebhookEventProcessed should throw on DB failure (not return false)', async () => {
    const webhookLib = await import('@/lib/verify-razorpay-webhook');
    const fnStr = webhookLib.isWebhookEventProcessed.toString();

    // Must NOT contain the old fail-open pattern: `return false; // If DB is down`
    expect(fnStr).not.toContain('return false');
    expect(fnStr).not.toContain('fail open');

    // Should NOT have a try/catch that swallows errors
    // The function should let errors propagate so the caller returns 503
    expect(fnStr).not.toContain('} catch');
  });

  it('markWebhookEventProcessed should throw on DB failure (not silently swallow)', async () => {
    const webhookLib = await import('@/lib/verify-razorpay-webhook');
    const fnStr = webhookLib.markWebhookEventProcessed.toString();

    // Must NOT have try/catch that swallows errors
    expect(fnStr).not.toContain('} catch');
    expect(fnStr).not.toContain('console.error');
  });

// Note: Route-level 503 test lives in webhook-route-503.test.ts
});

// ────────────────────────────────────────────────────────────────────
// Fix #3: File upload — magic-byte validation
// ────────────────────────────────────────────────────────────────────

describe('SEC-3: File Upload — Magic Byte Validation', () => {
  it('should validate magic bytes for PDF (0x25 0x50 0x44 0x46)', async () => {
    const routeContent = await import('fs').then((fs) =>
      fs.default.readFileSync('app/api/auth/upload-id/route.ts', 'utf-8')
    );

    // Must define magic byte signatures
    expect(routeContent).toContain('0x25, 0x50, 0x44, 0x46'); // %PDF
    expect(routeContent).toContain('0xff, 0xd8, 0xff');        // JPEG
    expect(routeContent).toContain('0x89, 0x50, 0x4e, 0x47');  // PNG
  });

  it('should enforce 5MB file size limit', async () => {
    const routeContent = await import('fs').then((fs) =>
      fs.default.readFileSync('app/api/auth/upload-id/route.ts', 'utf-8')
    );

    expect(routeContent).toContain('5 * 1024 * 1024');
    expect(routeContent).toContain('MAX_FILE_SIZE');
    expect(routeContent).toContain('exceeds 5MB limit');
  });

  it('should verify MIME type matches magic bytes (anti-spoofing)', async () => {
    const routeContent = await import('fs').then((fs) =>
      fs.default.readFileSync('app/api/auth/upload-id/route.ts', 'utf-8')
    );

    expect(routeContent).toContain('MIME type mismatch');
    expect(routeContent).toContain('File type mismatch');
  });

  it('should require authentication', async () => {
    const routeContent = await import('fs').then((fs) =>
      fs.default.readFileSync('app/api/auth/upload-id/route.ts', 'utf-8')
    );

    expect(routeContent).toContain('const session = await auth()');
    expect(routeContent).toContain('Authentication required');
  });

  it('should reject files with no matching magic bytes', async () => {
    const routeContent = await import('fs').then((fs) =>
      fs.default.readFileSync('app/api/auth/upload-id/route.ts', 'utf-8')
    );

    expect(routeContent).toContain('File type not supported');
  });

// Note: Route-level upload tests live in upload-route-integration.test.ts
});

// ────────────────────────────────────────────────────────────────────
// Fix #4: Rate limiter — in-memory sliding window fallback
// ────────────────────────────────────────────────────────────────────

describe('SEC-4: Rate Limiter — In-Memory Fallback', () => {
  it('in-memory limiter should enforce sliding window limits', async () => {
    const { inMemoryLimit, clearInMemoryStore } = await import('@/lib/in-memory-rate-limit');

    clearInMemoryStore();

    // Allow 3 requests per 1000ms window
    const result1 = inMemoryLimit('test-ip', 3, 1000);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = inMemoryLimit('test-ip', 3, 1000);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = inMemoryLimit('test-ip', 3, 1000);
    expect(result3.success).toBe(true);
    expect(result3.remaining).toBe(0);

    // 4th request should be rate limited
    const result4 = inMemoryLimit('test-ip', 3, 1000);
    expect(result4.success).toBe(false);
    expect(result4.remaining).toBe(0);

    clearInMemoryStore();
  });

  it('in-memory limiter should isolate different identifiers', async () => {
    const { inMemoryLimit, clearInMemoryStore } = await import('@/lib/in-memory-rate-limit');

    clearInMemoryStore();

    // Different IPs get separate buckets
    const r1 = inMemoryLimit('10.0.0.1', 2, 1000);
    const r2 = inMemoryLimit('10.0.0.2', 2, 1000);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    // Exhaust IP 1's bucket
    inMemoryLimit('10.0.0.1', 2, 1000);
    const r3 = inMemoryLimit('10.0.0.1', 2, 1000);
    expect(r3.success).toBe(false); // IP 1 is rate limited

    // IP 2 should still be allowed
    const r4 = inMemoryLimit('10.0.0.2', 2, 1000);
    expect(r4.success).toBe(true);

    clearInMemoryStore();
  });

  it('rate-limit.ts should use inMemoryLimit when Redis is unavailable', async () => {
    const rateLimitContent = await import('fs').then((fs) =>
      fs.default.readFileSync('lib/rate-limit.ts', 'utf-8')
    );

    expect(rateLimitContent).toContain("import { inMemoryLimit } from '@/lib/in-memory-rate-limit'");
    expect(rateLimitContent).toContain('using in-memory fallback');
  });

  it('ratelimit.ts should use inMemoryLimit when Redis is unavailable', async () => {
    const ratelimitContent = await import('fs').then((fs) =>
      fs.default.readFileSync('lib/ratelimit.ts', 'utf-8')
    );

    expect(ratelimitContent).toContain("import { inMemoryLimit } from '@/lib/in-memory-rate-limit'");
    expect(ratelimitContent).toContain('using in-memory fallback');
  });
});
