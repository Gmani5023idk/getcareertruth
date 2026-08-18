/**
 * Unit tests for apiHandler() wrapper
 * =====================================
 *
 * Coverage:
 *   ✅ Success path — GET (query params) and POST (JSON body)
 *   ✅ Zod validation failure → 400 VALIDATION_ERROR
 *   ✅ Malformed JSON body → 400 VALIDATION_ERROR
 *   ✅ Unauthenticated request → 401 UNAUTHORIZED
 *   ✅ Wrong role → 403 FORBIDDEN
 *   ✅ Prisma P2002 unique constraint → 409 CONFLICT
 *   ✅ Prisma P2025 not found → 404 NOT_FOUND
 *   ✅ Prisma P2003 foreign key → 404 NOT_FOUND
 *   ✅ Uncaught error → 500 INTERNAL_ERROR
 *   ✅ success() convenience function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mock next-auth's auth()
// ---------------------------------------------------------------------------
let mockSession: Record<string, unknown> | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// ---------------------------------------------------------------------------
// Mock Prisma so we can throw error objects with `code` property
// (the wrapper uses duck-typing to detect Prisma errors)
// ---------------------------------------------------------------------------
vi.mock('@/lib/db', () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks are registered (vitest hoists vi.mock calls)
// ---------------------------------------------------------------------------
import { apiHandler, success } from '@/lib/api-handler';
import type { HandlerSession } from '@/lib/api-handler';

// Pre-compute the Zod-inferred types so we can annotate handler params.
// Using z.infer<> avoids mismatches between the test annotation and the
// generic T that apiHandler infers from the schema.
type TestBody = z.infer<typeof testSchema>;
type QueryBody = z.infer<typeof querySchema>;

// The session type matches what apiHandler passes at runtime.
type HandlerContext<T> = {
  body: T;
  session: HandlerSession | null;
};

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal NextRequest-like object.
 */
function mockRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000');

  const req = {
    method,
    url: urlObj.toString(),
    nextUrl: {
      searchParams: urlObj.searchParams,
      pathname: urlObj.pathname,
    },
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as NextRequest;

  return req;
}

/**
 * Parse a response body safely (body can only be read once).
 */
async function parseBody(response: NextResponse): Promise<unknown> {
  return response.json();
}

// ---------------------------------------------------------------------------
// Schemas for test routes
// ---------------------------------------------------------------------------

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('apiHandler()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated (null session)
    mockSession = null;
  });

  // ── Success path ───────────────────────────────────────────────

  describe('success path', () => {
    it('handles POST with valid body and session', async () => {
      mockSession = {
        user: { id: 'user-1', role: 'STUDENT', email: 'test@test.com' },
      };

      const handler = apiHandler({
        schema: testSchema,
        requireAuth: true,
        allowedRoles: ['STUDENT'],
        handler: async (params: HandlerContext<TestBody>) => {
          return NextResponse.json({ success: true, data: { body: params.body, userId: params.session!.user.id } });
        },
      });

      const req = mockRequest('POST', '/api/test', { name: 'Test', email: 'test@test.com' });
      const response = await handler(req);

      expect(response.status).toBe(200);
      const json = await parseBody(response) as Record<string, unknown>;
      expect(json.success).toBe(true);
      const data = json.data as Record<string, unknown>;
      expect(data.body).toEqual({ name: 'Test', email: 'test@test.com' });
      expect(data.userId).toBe('user-1');
    });

    it('handles GET with query params', async () => {
      const handler = apiHandler({
        schema: querySchema,
        handler: async (params: HandlerContext<QueryBody>) => {
          return NextResponse.json({ success: true, data: params.body });
        },
      });

      const req = mockRequest('GET', '/api/test?page=1&limit=10');
      const response = await handler(req);

      expect(response.status).toBe(200);
      const json = await parseBody(response) as Record<string, unknown>;
      expect(json.data).toEqual({ page: '1', limit: '10' });
    });

    it('works without schema, auth, or role requirements', async () => {
      const handler = apiHandler({
        handler: async () => {
          return NextResponse.json({ success: true, data: { message: 'ok' } });
        },
      });

      const req = mockRequest('GET', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(200);
    });
  });

  // ── Validation failures ────────────────────────────────────────

  describe('validation failures', () => {
    it('returns 400 when Zod validation fails on body', async () => {
      const handler = apiHandler({
        schema: testSchema,
        handler: async () => NextResponse.json({ success: true, data: {} }),
      });

      const req = mockRequest('POST', '/api/test', {});
      const response = await handler(req);

      expect(response.status).toBe(400);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.error).toContain('Validation failed');
      expect(body.detail).toContain('name');
      expect(body.detail).toContain('email');
    });

    it('returns 400 when Zod validation fails on query params', async () => {
      const handler = apiHandler({
        schema: testSchema,
        handler: async () => NextResponse.json({ success: true, data: {} }),
      });

      const req = mockRequest('GET', '/api/test?name=Test');
      const response = await handler(req);

      expect(response.status).toBe(400);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when JSON body is malformed', async () => {
      const handler = apiHandler({
        schema: testSchema,
        handler: async () => NextResponse.json({ success: true, data: {} }),
      });

      const req = mockRequest('POST', '/api/test');
      req.json = async () => { throw new SyntaxError('Unexpected token'); };

      const response = await handler(req);
      expect(response.status).toBe(400);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.error).toContain('Invalid JSON');
    });
  });

  // ── Authentication failures ────────────────────────────────────

  describe('authentication failures', () => {
    it('returns 401 when requireAuth is true but no session', async () => {
      const handler = apiHandler({
        handler: async () => NextResponse.json({ success: true, data: {} }),
        requireAuth: true,
      });

      const req = mockRequest('GET', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(401);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(body.error).toContain('Authentication required');
    });

    it('returns 403 when user role is not allowed', async () => {
      mockSession = {
        user: { id: 'user-1', role: 'STUDENT' },
      };

      const handler = apiHandler({
        requireAuth: true,
        allowedRoles: ['ADMIN'],
        handler: async () => NextResponse.json({ success: true, data: {} }),
      });

      const req = mockRequest('GET', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(403);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('FORBIDDEN');
      expect(body.error).toContain('Access denied');
    });

    it('returns 401 when auth() returns a session without user.id', async () => {
      mockSession = { user: { role: 'STUDENT' as string } };

      const handler = apiHandler({
        requireAuth: true,
        handler: async () => NextResponse.json({ success: true, data: {} }),
      });

      const req = mockRequest('GET', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(401);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  // ── Prisma errors ──────────────────────────────────────────────

  describe('Prisma error mapping', () => {
    it('maps P2002 (unique constraint) to 409 CONFLICT', async () => {
      const handler = apiHandler({
        handler: async () => {
          // Simulate a Prisma P2002 error — throw an object with `code`.
          // The wrapper duck-types Prisma errors by checking `code in error`.
          const err = new Error('Unique constraint failed');
          (err as unknown as Record<string, unknown>).code = 'P2002';
          (err as unknown as Record<string, unknown>).meta = { target: ['email'] };
          throw err;
        },
      });

      const req = mockRequest('POST', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(409);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('CONFLICT');
      expect(body.error).toContain('already exists');
      expect(body.error).toContain('email');
    });

    it('maps P2025 (not found) to 404 NOT_FOUND', async () => {
      const handler = apiHandler({
        handler: async () => {
          const err = new Error('Record not found');
          (err as unknown as Record<string, unknown>).code = 'P2025';
          throw err;
        },
      });

      const req = mockRequest('DELETE', '/api/test/999');
      const response = await handler(req);

      expect(response.status).toBe(404);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('NOT_FOUND');
      expect(body.error).toContain('not found');
    });

    it('maps P2003 (foreign key) to 404 NOT_FOUND', async () => {
      const handler = apiHandler({
        handler: async () => {
          const err = new Error('Foreign key constraint');
          (err as unknown as Record<string, unknown>).code = 'P2003';
          throw err;
        },
      });

      const req = mockRequest('POST', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(404);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('NOT_FOUND');
      expect(body.error).toContain('does not exist');
    });

    it('does NOT intercept errors with unknown P-codes', async () => {
      const handler = apiHandler({
        handler: async () => {
          const err = new Error('Some Prisma error');
          (err as unknown as Record<string, unknown>).code = 'P2020'; // unrecognized code
          throw err;
        },
      });

      const req = mockRequest('GET', '/api/test');

      const response = await handler(req);
      expect(response.status).toBe(500);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });

  // ── Unhandled errors ───────────────────────────────────────────

  describe('unhandled errors', () => {
    it('returns 500 on unhandled exception', async () => {
      const handler = apiHandler({
        handler: async () => {
          throw new Error('Something went terribly wrong');
        },
      });

      const req = mockRequest('GET', '/api/test');
      const response = await handler(req);

      expect(response.status).toBe(500);
      const body = await parseBody(response) as Record<string, unknown>;
      expect(body.success).toBe(false);
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });

  // ── success() convenience ───────────────────────────────────────

  describe('success()', () => {
    it('returns 200 with { success: true, data }', () => {
      const response = success({ id: '123', name: 'Test' });
      expect(response.status).toBe(200);
    });

    it('accepts custom status code', () => {
      const response = success({ id: '123' }, 201);
      expect(response.status).toBe(201);
    });
  });
});
