# Auth System Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Google OAuth, signup step validation, and login consistency bugs in the GetCareerTruth auth system.

**Architecture:** Unified Auth Service pattern for login consistency, Zod-based step validation for signup, and proper NextAuth integration for Google provider.

**Tech Stack:** Next.js (App Router), NextAuth.js v5, Prisma, Zod, bcryptjs.

---

### Task 1: Create Unified Auth Service

**Files:**
- Modify: `lib/auth.ts`

- [ ] **Step 1: Define `validateUser` helper in `lib/auth.ts`**
Extract the core authentication logic from the provider and API route into a reusable function.

```typescript
// lib/auth.ts
// ... imports ...
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

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
```

- [ ] **Step 2: Refactor `CredentialsProvider` to use `validateUser`**

```typescript
// lib/auth.ts
// ...
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await validateUser(
            credentials.email as string,
            credentials.password as string
          );

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.studentProfile?.fullName ||
                  user.employeeProfile?.fullName ||
                  user.parentProfile?.fullName ||
                  user.email,
            image: user.profilePhoto,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
// ...
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(auth): add unified validateUser service"
```

---

### Task 2: Fix Login API Route and Google Integration

**Files:**
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Update Login API to use `validateUser` and fix field mapping**

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/shared/schemas/auth.schema';
import { validateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const user = await validateUser(validatedData.email, validatedData.password);

    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    let message = 'An unexpected error occurred';
    let status = 500;

    if (error.name === 'ZodError') {
      message = 'Invalid input data';
      status = 400;
    } else if (error.message === 'USER_NOT_FOUND') {
      message = 'No account found with this email';
      status = 401;
    } else if (error.message === 'INVALID_PASSWORD') {
      message = 'Incorrect password';
      status = 401;
    } else if (error.message === 'SOCIAL_AUTH_ONLY') {
      message = 'Please use Google to sign in to this account';
      status = 401;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Add Google Login handler and error mapping to Login Page**

```typescript
// app/(auth)/login/page.tsx
import { signIn } from 'next-auth/react'; // Add this import

// Inside LoginPage component:
  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard/student' }); // Redirect URL should be dynamic based on role if known, but /dashboard/student is the default for now
  };

// Update handleLogin's error handling:
      if (!response.ok) {
        setError(data.error || 'Login failed'); // This will now show the specific message
        return;
      }

// Update the Google button in JSX:
              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                className="...">
```

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/login/route.ts app/(auth)/login/page.tsx
git commit -m "fix(auth): update login route and add google handler"
```

---

### Task 3: Implement Zod Step Validation in Student Signup

**Files:**
- Modify: `app/(auth)/signup/student/page.tsx`

- [ ] **Step 1: Import schemas and implement step validation logic**

```typescript
// app/(auth)/signup/student/page.tsx
import { signupBasicSchema, studentEducationSchema, studentGoalsSchema } from '@/shared/schemas/auth.schema';
import { signIn } from 'next-auth/react';

// Inside StudentSignupPage:
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleNext = () => {
    setFieldErrors({});
    let result;

    if (step === 1) {
      result = signupBasicSchema.safeParse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
    } else if (step === 2) {
      const eduData = educationType === 'SCHOOL' ? {
        educationType,
        schoolName: formData.schoolName,
        className: formData.className,
        stream: formData.stream,
      } : {
        educationType,
        collegeName: formData.collegeName,
        degree: formData.degree,
        branch: formData.branch,
        currentYear: formData.currentYear,
        collegeEmail: formData.collegeEmail || undefined,
      };
      result = studentEducationSchema.safeParse(eduData);
    }

    if (result && !result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
      });
      setFieldErrors(newErrors);
      return;
    }

    if (step < 3) setStep(step + 1);
  };
```

- [ ] **Step 2: Add Google Login handler and error displays to JSX**

```typescript
// app/(auth)/signup/student/page.tsx
  const handleGoogleSignup = () => {
    signIn('google', { callbackUrl: '/dashboard/student' });
  };

// In the JSX, add error messages under inputs:
// Example:
{fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}

// And update the Google button:
<button type="button" onClick={handleGoogleSignup} ...>
```

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/signup/student/page.tsx
git commit -m "fix(auth): add step validation and google handler to student signup"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Verify Google Provider config in `.env`**
Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present and correct.

- [ ] **Step 2: Verify database field names in Prisma**
Ensure the field is `passwordHash` and not `password` as used in the original buggy code.

- [ ] **Step 3: Test Login with wrong credentials**
Expect: "Incorrect password" or "No account found..." message instead of "Something went wrong".

- [ ] **Step 4: Test Signup Step 1 with empty fields**
Expect: Page should not progress, and validation errors should appear.
