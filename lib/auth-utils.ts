import { type Session } from "next-auth";
import { NextResponse } from "next/server";
import type { AuthenticatedSession, UserRole } from "@/types/next-auth";

// ---------------------------------------------------------------------------
// AuthenticationError — typed error with machine-readable code
// ---------------------------------------------------------------------------

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// ---------------------------------------------------------------------------
// requireRole — assertion function (throws on failure)
// Use in server actions, middleware, or any context where throwing is ergonomic.
//
//   const session = await auth();
//   requireRole(session, ["ADMIN"]);
//   // session is now narrowed to AuthenticatedSession
//   console.log(session.user.id); // string
// ---------------------------------------------------------------------------

export function requireRole(
  session: Session | null,
  allowedRoles: UserRole[],
): asserts session is AuthenticatedSession {
  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required", "UNAUTHENTICATED");
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthenticationError(
      `Access denied. Required role: ${allowedRoles.join(" or ")}, got: ${session.user.role}`,
      "FORBIDDEN",
    );
  }
}

/** Convenience: requires ADMIN role */
export function requireAdmin(session: Session | null): asserts session is AuthenticatedSession {
  requireRole(session, ["ADMIN"]);
}

/** Convenience: requires STUDENT role */
export function requireStudent(session: Session | null): asserts session is AuthenticatedSession {
  requireRole(session, ["STUDENT"]);
}

/** Convenience: requires EMPLOYEE role */
export function requireEmployee(session: Session | null): asserts session is AuthenticatedSession {
  requireRole(session, ["EMPLOYEE"]);
}

// ---------------------------------------------------------------------------
// hasRole — type guard (returns boolean, no throw)
// Use in API route handlers where you want to return a Response on failure.
//
//   const session = await auth();
//   if (!hasRole(session, ["ADMIN"])) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//   // session is narrowed to AuthenticatedSession
//   console.log(session.user.id); // string (guaranteed)
// ---------------------------------------------------------------------------

export function hasRole(
  session: Session | null,
  allowedRoles: UserRole[],
): session is AuthenticatedSession {
  return !!session?.user?.id && allowedRoles.includes(session.user.role);
}

// ---------------------------------------------------------------------------
// authorizeRoute — convenience for route handlers (one-liner guard)
// Returns a NextResponse (401/403) on failure, null on success.
//
//   const authError = authorizeRoute(await auth(), ["ADMIN"]);
//   if (authError) return authError;
//   // session is still Session | null — use hasRole() for narrowing
// ---------------------------------------------------------------------------

export function authorizeRoute(
  session: Session | null,
  allowedRoles: UserRole[],
): NextResponse | null {
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { error: `Access denied. Requires role: ${allowedRoles.join(" or ")}` },
      { status: 403 },
    );
  }
  return null;
}
