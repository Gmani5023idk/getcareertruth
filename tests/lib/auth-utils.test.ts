import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, hasRole, authorizeRoute, AuthenticationError } from '@/lib/auth-utils';
import type { Session } from 'next-auth';

// ---------------------------------------------------------------------------
// Mock next/server
// ---------------------------------------------------------------------------
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: Record<string, unknown>, init?: { status: number }) => ({
      status: init?.status ?? 200,
      body,
      json: async () => body,
    })),
  },
}));

// Import the mocked NextResponse — vi.mock is hoisted
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers — build valid Session objects
// ---------------------------------------------------------------------------
function makeSession(overrides: Partial<Record<string, unknown>> = {}): Session {
  return {
    user: {
      id: 'user-1',
      role: 'STUDENT',
      email: 'student@test.com',
      name: 'Test Student',
      ...overrides,
    },
    expires: '2099-01-01T00:00:00.000Z',
  } as Session;
}

const nullSession = null as Session | null;
const emptySession = {} as Session;

// ---------------------------------------------------------------------------
// requireRole()
// ---------------------------------------------------------------------------
describe('requireRole()', () => {
  it('throws UNAUTHENTICATED when session is null', () => {
    expect(() => requireRole(nullSession, ['ADMIN'])).toThrow(AuthenticationError);
    expect(() => requireRole(nullSession, ['ADMIN'])).toThrow('Authentication required');
    try {
      requireRole(nullSession, ['ADMIN']);
    } catch (e) {
      expect((e as AuthenticationError).code).toBe('UNAUTHENTICATED');
    }
  });

  it('throws UNAUTHENTICATED when session is an empty object (no user)', () => {
    expect(() => requireRole(emptySession, ['ADMIN'])).toThrow(AuthenticationError);
  });

  it('throws UNAUTHENTICATED when session.user exists but lacks id', () => {
    const session = { user: { role: 'STUDENT' as const }, expires: '' } as unknown as Session;
    expect(() => requireRole(session, ['STUDENT'])).toThrow(AuthenticationError);
  });

  it('throws UNAUTHENTICATED when session.user.id is empty string', () => {
    const session = makeSession({ id: '' });
    expect(() => requireRole(session, ['STUDENT'])).toThrow(AuthenticationError);
  });

  it('throws FORBIDDEN when user has a role not in allowedRoles', () => {
    const session = makeSession({ role: 'STUDENT' });
    expect(() => requireRole(session, ['ADMIN'])).toThrow(AuthenticationError);
    expect(() => requireRole(session, ['ADMIN'])).toThrow('Access denied');
    try {
      requireRole(session, ['ADMIN']);
    } catch (e) {
      expect((e as AuthenticationError).code).toBe('FORBIDDEN');
    }
  });

  it('throws FORBIDDEN when user.role is undefined', () => {
    const session = makeSession({ role: undefined });
    // role is required by Session type at compile time, but at runtime it might be missing
    // from a malformed JWT. We cast to simulate this edge case.
    const malformed = { user: { id: 'user-1' }, expires: '' } as unknown as Session;
    expect(() => requireRole(malformed, ['STUDENT'])).toThrow(AuthenticationError);
    expect(() => requireRole(malformed, ['STUDENT'])).toThrow('Access denied');
  });

  it('passes (no throw) when user has one of the allowed roles', () => {
    const session = makeSession({ role: 'STUDENT' });
    expect(() => requireRole(session, ['STUDENT'])).not.toThrow();
    expect(() => requireRole(session, ['STUDENT', 'ADMIN'])).not.toThrow();
  });

  it('passes for ADMIN role', () => {
    const session = makeSession({ role: 'ADMIN' });
    expect(() => requireRole(session, ['ADMIN'])).not.toThrow();
  });

  it('narrows session type — allows accessing user.id after assertion', () => {
    const session = makeSession({ role: 'EMPLOYEE' });
    requireRole(session, ['EMPLOYEE']);
    // After assertion, TypeScript narrows to AuthenticatedSession
    // where user.id is guaranteed string (not string | undefined)
    const id: string = session.user.id;
    expect(id).toBe('user-1');
  });
});

// ---------------------------------------------------------------------------
// hasRole()
// ---------------------------------------------------------------------------
describe('hasRole()', () => {
  it('returns false when session is null', () => {
    expect(hasRole(nullSession, ['ADMIN'])).toBe(false);
  });

  it('returns false when session.user.id is missing', () => {
    expect(hasRole(emptySession, ['ADMIN'])).toBe(false);
  });

  it('returns false when user.role is not in allowedRoles', () => {
    const session = makeSession({ role: 'STUDENT' });
    expect(hasRole(session, ['ADMIN'])).toBe(false);
    expect(hasRole(session, ['EMPLOYEE'])).toBe(false);
    expect(hasRole(session, ['PARENT'])).toBe(false);
  });

  it('returns false when user.role is undefined (malformed JWT)', () => {
    const malformed = { user: { id: 'user-1' }, expires: '' } as unknown as Session;
    expect(hasRole(malformed, ['STUDENT'])).toBe(false);
  });

  it('returns true when user has one of the allowed roles', () => {
    const session = makeSession({ role: 'STUDENT' });
    expect(hasRole(session, ['STUDENT'])).toBe(true);
    expect(hasRole(session, ['STUDENT', 'ADMIN'])).toBe(true);
  });

  it('returns true for ADMIN role when admin is allowed', () => {
    const session = makeSession({ role: 'ADMIN' });
    expect(hasRole(session, ['ADMIN'])).toBe(true);
  });

  it('acts as a type guard — narrows session after true check', () => {
    const session: Session | null = makeSession({ role: 'EMPLOYEE' });
    if (hasRole(session, ['EMPLOYEE'])) {
      // Inside this block, TypeScript narrows session to AuthenticatedSession
      // user.id is guaranteed string
      const id: string = session.user.id;
      expect(id).toBe('user-1');
    }
  });
});

// ---------------------------------------------------------------------------
// authorizeRoute()
// ---------------------------------------------------------------------------
describe('authorizeRoute()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 response when session is null', () => {
    const result = authorizeRoute(nullSession, ['ADMIN']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  });

  it('returns 401 when session has no user (empty object)', () => {
    const result = authorizeRoute(emptySession, ['ADMIN']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns 403 when user lacks the required role', () => {
    const session = makeSession({ role: 'STUDENT' });
    const result = authorizeRoute(session, ['ADMIN']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Access denied') }),
      { status: 403 },
    );
  });

  it('returns 403 when user.role is missing (malformed JWT)', () => {
    const malformed = { user: { id: 'user-1' }, expires: '' } as unknown as Session;
    const result = authorizeRoute(malformed, ['STUDENT']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('returns null when user has the correct role', () => {
    const session = makeSession({ role: 'ADMIN' });
    const result = authorizeRoute(session, ['ADMIN']);
    expect(result).toBeNull();
  });

  it('returns null when user has one of the allowed roles', () => {
    const session = makeSession({ role: 'EMPLOYEE' });
    const result = authorizeRoute(session, ['STUDENT', 'EMPLOYEE', 'PARENT']);
    expect(result).toBeNull();
  });

  it('does not make a NextResponse.json call on success', () => {
    const session = makeSession({ role: 'ADMIN' });
    authorizeRoute(session, ['ADMIN']);
    expect(NextResponse.json).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Edge Cases — malformed JWT / runtime shape mismatches
// ---------------------------------------------------------------------------
describe('Edge cases — malformed session shapes', () => {
  // Simulate what happens when a JWT callback produces an unexpected shape
  it('handles session with extra unknown properties gracefully (no crash)', () => {
    const polluted = {
      user: { id: 'user-1', role: 'STUDENT', __proto__: { isAdmin: true } },
      expires: '',
    } as unknown as Session;
    expect(hasRole(polluted, ['STUDENT'])).toBe(true);
  });

  it('requireRole throws UNAUTHENTICATED for session with user.id = null', () => {
    const broken = { user: { id: null, role: 'STUDENT' }, expires: '' } as unknown as Session;
    expect(() => requireRole(broken, ['STUDENT'])).toThrow('Authentication required');
  });

  it('authorizeRoute returns 401 for session.user = null', () => {
    const broken = { user: null, expires: '' } as unknown as Session;
    const result = authorizeRoute(broken, ['ADMIN']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
