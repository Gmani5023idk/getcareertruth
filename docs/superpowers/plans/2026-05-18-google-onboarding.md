# Implementation Plan: Google OAuth Onboarding

**Goal:** Implement role-based onboarding for new Google users.

### Task 1: Update NextAuth Configuration

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Implement `signIn` callback**
Update `lib/auth.ts` to check if a user exists. If yes, add role to the token. If no, mark as a new user.

```typescript
// lib/auth.ts

// ... inside NextAuth config object ...
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
        
        if (dbUser) {
          // Returning user, role already assigned
          return true;
        } else {
          // New user, redirect to onboarding
          return '/onboarding'; 
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Fetch role if missing in token
        if (!token.role) {
            const dbUser = await prisma.user.findUnique({ where: { email: token.email! } });
            token.role = dbUser?.role;
        }
      }
      // ...
      return token;
    },
    // ... session callback ...
  },
```

### Task 2: Create Onboarding Page

**Files:**
- Create: `app/(auth)/onboarding/page.tsx`

- [ ] **Step 1: Implement role selection**
Create a form that allows the user to choose "Student" or "Employee" and calls an API route to save the role to the database.

### Task 3: Update Middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Allow access to /onboarding**
Ensure `middleware.ts` doesn't redirect users on the `/onboarding` page back to login.

```typescript
// middleware.ts

// ...
  // 1. Protect Dashboard Routes
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Protect Auth Routes
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
    if (token) {
      return NextResponse.redirect(new URL(`/dashboard/${token.role?.toLowerCase() || 'student'}`, request.url));
    }
  }
// ...
```
*(No change needed here if `/onboarding` is not protected, but worth verifying)*

---

### Verification
1.  Sign in with a brand new Google account. Expected: Redirect to `/onboarding`.
2.  Complete onboarding (select role). Expected: Redirect to `/dashboard/<role>`.
3.  Sign in with the same Google account again. Expected: Redirect immediately to `/dashboard/<role>`.
