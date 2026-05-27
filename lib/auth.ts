import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { auditLog, AuditAction } from '@/lib/audit-log';
import { loginRateLimit } from '@/lib/ratelimit';

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      studentProfile: true,
      employeeProfile: true,
      parentProfile: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  if (!user.passwordHash) {
    throw new Error('SOCIAL_AUTH_ONLY');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('INVALID_PASSWORD');
  }

  return user;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Extract IP from request headers
          const headers = req?.headers as Headers | undefined;
          const ip = headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headers?.get('x-real-ip')?.trim()
            || 'unknown';

          // Rate limiting: 5 attempts per 15 minutes per IP
          try {
            const result = await loginRateLimit.limit(ip);
            if (!result.success) {
              console.warn(`Rate limit hit for login from IP: ${ip}`);
              // Audit log for rate limit hit
              await auditLog({
                action: AuditAction.RATE_LIMIT_HIT,
                entity: 'Login',
                metadata: { reason: 'Rate limited', ip },
                success: false,
              }).catch(() => {});
              return null;
            }
          } catch (rateLimitError) {
            // Fail open if Upstash is unavailable
            console.error('Rate limit check failed (allowing login):', rateLimitError);
          }

          const user = await validateUser(
            credentials.email as string,
            credentials.password as string
          );

          // Audit log for successful login
          await auditLog({
            userId: user.id,
            action: AuditAction.USER_LOGIN,
            entity: 'User',
            entityId: user.id,
            ipAddress: ip,
            success: true,
          });

          return {
            id: user.id,
            email: user.email,
            role: user.role || 'STUDENT',
            name: user.studentProfile?.fullName ||
                  user.employeeProfile?.fullName ||
                  user.parentProfile?.fullName ||
                  user.email,
            image: user.profilePhoto,
          };
        } catch (error) {
          // Audit log for failed login
          const headers = req?.headers as Headers | undefined;
          const ip = headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headers?.get('x-real-ip')?.trim()
            || 'unknown';
          await auditLog({
            action: AuditAction.USER_LOGIN_FAILED,
            entity: 'User',
            metadata: { email: credentials.email, reason: (error as Error).message },
            ipAddress: ip,
            success: false,
          }).catch(() => {});
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
   callbacks: {
     async signIn({ user, account }) {
       console.log('signIn callback triggered for provider:', account?.provider, 'user email:', user.email);
       
       // Audit log for sign in
       await auditLog({
         userId: user.id,
         action: AuditAction.USER_LOGIN,
         entity: 'User',
         entityId: user.id,
         metadata: { provider: account?.provider },
         success: true,
       }).catch(() => {});
       
       return true;
     },
     async redirect({ url, baseUrl }) {
       // Allows relative callback URLs
       if (url.startsWith("/")) return `${baseUrl}${url}`;
       
       // Allows callback URLs on the same origin
       else if (new URL(url).origin === baseUrl) return url;
       
       // Default to baseUrl if not safe
       return baseUrl;
     },
      async jwt({ token, user, account, trigger, session }) {
        // Initial sign in
        if (user) {
          token.id = user.id;
          token.role = (user as any).role;
          // Mark if this is a new Google user (no role yet)
          if (account?.provider === 'google' && !(user as any).role) {
            token.isNewGoogleUser = true;
          }
        }
       
       // If role is missing in token, fetch it from DB
       if (token.email && !token.role) {
         const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
         if (dbUser) {
           token.role = dbUser.role || 'STUDENT';
           // Clear the new user flag if we found a role
           token.isNewGoogleUser = false;
         }
       }

       if (trigger === 'update' && session) {
         token = { ...token, ...session };
       }

       return token;
     },
     async session({ session, token }) {
       if (token && session.user) {
         session.user.id = token.id as string;
         (session.user as any).role = token.role as string;
       }
       return session;
     },
  },
});
