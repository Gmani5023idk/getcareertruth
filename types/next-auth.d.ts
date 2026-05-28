import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

/**
 * Mirror of the Prisma `Role` enum for type-safe session access.
 * Avoids importing Prisma types into the frontend bundle.
 */
export type UserRole = "STUDENT" | "EMPLOYEE" | "PARENT" | "ADMIN";

declare module "next-auth" {
  /**
   * Session.user is augmented with `role` (enum: STUDENT | EMPLOYEE | PARENT | ADMIN)
   * and `isNewGoogleUser` for unregistered Google OAuth flows.
   * `id` is already provided by NextAuth v5's default User type.
   */
  interface Session {
    user: {
      role: UserRole;
      isNewGoogleUser?: boolean;
    } & DefaultSession["user"];
  }

  /**
   * User returned from authorize() and passed to JWT callback.
   * `role` comes from the Prisma User model via authorize().
   */
  interface User extends DefaultUser {
    role?: UserRole;
    isNewGoogleUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: UserRole;
    isNewGoogleUser?: boolean;
  }
}

// --- AuthenticatedSession (session with guaranteed user.id + user.role) ---

/**
 * A session where user.id and user.role are guaranteed to be present.
 * Use with requireRole() to avoid repeated null checks in route handlers.
 */
export interface AuthenticatedSession {
  user: {
    id: string;
    role: UserRole;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    isNewGoogleUser?: boolean;
  };
  expires: string;
}
