# Refactored Code Examples — Before / After

Three concrete before/after examples corresponding to the three problems:

1. **`new PrismaClient()` misuse** → shared singleton
2. **Silent Zoom failure** → proper error surfacing + fallback
3. **Missing input validation** → Zod schema + apiHandler integration

---

## Example 1: PrismaClient Misuse → Shared Singleton

### Before — `app/api/transcripts/route.ts` (lines 1-6)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const prisma = new PrismaClient();
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ PROBLEM
// Each module import creates a NEW connection pool.
// Under concurrent load (e.g., transcripts + OTP + upload-id calls),
// this opens 3+ separate pools against Neon, exhausting the
// connection limit (default: ~100 connections on Neon Free).
```

**Why this is dangerous:** Prisma's connection pool defaults to `pool.max = 10` connections per client instance. With 6 routes each creating `new PrismaClient()`, a burst of 15 concurrent requests can create 90 database connections — nearly saturating Neon's 100-connection limit.

### After — `app/api/transcripts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
//       ^^^^^^^ FIX: Import the singleton instance from lib/db.ts
// lib/db.ts reuses a single PrismaClient via globalThis.prisma,
// which means all routes share ONE connection pool.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
```

**What changed:**
- `import { PrismaClient } from '@prisma/client'` + `new PrismaClient()` → `import { prisma } from '@/lib/db'`
- Same `prisma` object, same API, zero behavioral change

**The singleton pattern** (`lib/db.ts`):
```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Rationale for each decision:**
- **`globalThis` storage**: Preserves the PrismaClient across hot-reloads in development (Next.js resets modules but not global)
- **Double-bang check** (`??`): Avoids re-instantiation on every module import
- **`process.env.NODE_ENV !== 'production'` guard**: The global cache is unnecessary in production (module caching works correctly); keeping it doesn't hurt but is redundant

---

## Example 2: Silent Zoom/Email Failure → Proper Error Surfacing

### Before — `lib/bookings.ts` (post-payment processing)

```typescript
export async function processConfirmedBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ /* ... */ });
  if (!booking) throw new Error('Booking not found');

  let meetingLink = booking.meetingLink;

  // 1. Create Zoom meeting if not exists
  if (!meetingLink) {
    try {
      const meeting = await createZoomMeeting({ /* ... */ });
      meetingLink = meeting.join_url;
      await prisma.booking.update({
        where: { id: bookingId },
        data: { meetingLink },
      });
    } catch (error) {
      console.error('Failed to create Zoom meeting:', error);
      // ^^^ SILENT FAILURE: booking proceeds without a meeting link.
      // The user pays ₹300 but receives no Zoom link.
      // No retry. No admin alert. No user notification.
      // The only evidence is a log line buried in CloudWatch.
    }
  }

  // 2. Create conversation...

  // 3. Send emails
  try {
    // Sends confirmation with meetingLink || '' — empty string!
    await sendPaymentConfirmedEmail({ /* meetingLink: '' */ });
    await sendMeetingCreatedEmail({ /* meetingLink: '' */ });
  } catch (error) {
    console.error('Failed to send emails:', error);
    // ^^^ ANOTHER SILENT FAILURE: user paid but gets zero notifications.
  }
}
```

**Bug impact:** User sees "Payment confirmed" in Razorpay, sees "Confirmed" status in the booking, but opens the dashboard and finds no meeting link. No way to join the session.

### After — `lib/bookings.ts`

```typescript
import { prisma } from '@/lib/db';
import { createZoomMeeting } from '@/lib/zoom';
import { sendPaymentConfirmedEmail, sendMeetingCreatedEmail } from '@/lib/email';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function processConfirmedBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { /* same includes as before */ },
  });
  if (!booking) throw new Error('Booking not found');

  let meetingLink = booking.meetingLink;

  // ── 1. Zoom Meeting Creation — FAIL HARD on first attempt ──
  // Rationale: The webhook handler (app/api/payments/webhook/route.ts)
  // will call this function. If Zoom fails, we throw, which causes the
  // webhook to return a 500 status. Razorpay automatically retries the
  // webhook up to 3 times (typically ~5m apart). This gives Zoom 3
  // chances to recover from transient errors.
  if (!meetingLink) {
    const meeting = await createZoomMeeting({
      userId: booking.employee.email!,
      scheduledAt: booking.scheduledAt,
      durationMins: booking.durationMins,
      topic: booking.topic || 'Career counseling session',
      agenda: `Career counseling for ${
        booking.student?.studentProfile?.fullName ||
        booking.parent?.parentProfile?.fullName || ''
      }`,
    });

    meetingLink = meeting.join_url;

    await prisma.booking.update({
      where: { id: bookingId },
      data: { meetingLink },
    });
  }

  // ── 2. Create conversation — non-critical, catch and continue ──
  // Rationale: A missing chat conversation is annoying but doesn't
  // break the core flow. The user can still join the Zoom meeting.
  // We log the failure and move on.
  if (!booking.conversationId) {
    try {
      const conversationType = booking.studentId
        ? 'STUDENT_EMPLOYEE'
        : booking.parentId
        ? 'PARENT_EMPLOYEE'
        : null;

      if (conversationType) {
        const conversation = await prisma.conversation.create({
          data: {
            type: conversationType,
            participants: {
              create: [
                { userId: booking.employeeId },
                { userId: (booking.studentId || booking.parentId)! },
              ],
            },
          },
        });

        await prisma.booking.update({
          where: { id: bookingId },
          data: { conversationId: conversation.id },
        });
      }
    } catch (error) {
      console.error('Conversation creation failed:', error);
      await auditLog({
        action: AuditAction.ADMIN_ACTION, // or add a dedicated action
        entity: 'Booking',
        entityId: bookingId,
        metadata: { error: 'conversation_creation_failed', detail: (error as Error).message },
        success: false,
      });
    }
  }

  // ── 3. Emails — best-effort with audit trail ──
  // Rationale: Email delivery is usually reliable (Resend has 99.9% uptime).
  // If it fails, we log it with full detail so support can manually resend.
  // We do NOT block the booking confirmation for an email failure.
  try {
    const employeeEmail = booking.employee.email;
    const customerEmail = booking.student?.email || booking.parent?.email;
    const employeeName = booking.employee.employeeProfile?.fullName || 'Mentor';
    const studentName =
      booking.student?.studentProfile?.fullName ||
      booking.parent?.parentProfile?.fullName || 'Student';

    if (employeeEmail) {
      await sendPaymentConfirmedEmail({
        to: employeeEmail,
        employeeName,
        scheduledAt: booking.scheduledAt,
        bookingTopic: booking.topic || 'Career counseling session',
        meetingLink: meetingLink || '',
      });
    }

    if (customerEmail) {
      await sendMeetingCreatedEmail({
        to: customerEmail,
        studentName,
        scheduledAt: booking.scheduledAt,
        meetingLink: meetingLink || '',
      });
    }
  } catch (error) {
    console.error('Email sending failed:', error);
    // Audit log for support team visibility
    await auditLog({
      action: AuditAction.ADMIN_ACTION,
      entity: 'Booking',
      entityId: bookingId,
      metadata: {
        error: 'email_sending_failed',
        detail: (error as Error).message,
      },
      success: false,
    });
  }

  return { meetingLink, conversationId: booking.conversationId };
}
```

**Key changes, explained:**
1. **Zoom creation no longer wrapped in try/catch** — if it throws, the error propagates up to the webhook handler, which returns 500. Razorpay retries the webhook automatically (typically 3 retries with ~5m gaps).
2. **Conversation creation still wrapped** — chat is non-essential; a missing conversation doesn't prevent the session.
3. **Email failures get audit log entries** — support can see "email_sending_failed" and manually resend from the admin panel. No more silent `console.error` that nobody reads.

### Webhook handler impact

The webhook route at `app/api/payments/webhook/route.ts` currently catches the error silently:

```typescript
try {
  await processConfirmedBooking(booking.id);
} catch (postError) {
  console.error('Webhook post-actions failed:', postError);
  // ^^^ This catch makes our "fail hard" strategy useless!
  // It swallows the Zoom failure and returns 200 to Razorpay.
}
```

**Fix for the webhook** — remove the inner try/catch so Zoom failures propagate:

```typescript
// In webhook route:
// Remove the try/catch wrapper so Zoom failure → 500 response → Razorpay retry
await processConfirmedBooking(booking.id);
```

---

## Example 3: Missing Input Validation → Zod Schema + apiHandler

### Before — `app/api/payments/payouts/route.ts` (POST handler)

```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;
    // ^^^ PROBLEM #1: No schema validation
    // - What if employeeId is null? → Prisma query returns null → "Employee not found"
    // - What if employeeId is an object ({ $gt: '' })? → Prisma throws P2023 (inconsistent input)
    // - What if body is not an object? → destructuring produces undefined → 404

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
        // ^^^ PROBLEM #2: Inconsistent error shape
        // This route returns { error }, but transcript routes return
        // { error, message }, and reviews route sometimes returns
        // raw (error as Error).message on 500s.
      );
    }

    // ... business logic ...

    return NextResponse.json(
      { message: 'Payout request created successfully', payoutAmount, /* ... */ },
      // ^^^ PROBLEM #3: Inconsistent success shape
      // Some routes return { booking }, some return { bookings },
      // some return { message, data }. No { success: true } envelope.
      { status: 200 }
    );
  } catch (error) {
    console.error('Request payout error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to request payout' },
      // ^^^ PROBLEM #4: Leaks error details to client
      // In production, (error as Error).message might contain SQL syntax,
      // internal API paths, or connection string fragments.
      { status: 500 }
    );
  }
}
```

### After — `app/api/payments/payouts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// FIX: Uses singleton from lib/db, not new PrismaClient()
import { apiHandler, success } from '@/lib/api-handler';
// FIX: Reusable wrapper provides consistent error shape + status codes
import { z } from 'zod';

// ── Zod Schema for Payout Request ──
const payoutRequestSchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .uuid('Employee ID must be a valid UUID'),
  // ^^^ Validation wins:
  // - Rejects empty strings (instead of passing them to Prisma)
  // - Rejects non-UUID strings (catches typos like "abc-123")
  // - All errors produce { success: false, error: "...", code: "VALIDATION_ERROR" }
});

const payoutQuerySchema = z.object({
  employeeId: z
    .string()
    .min(1, 'Employee ID is required')
    .uuid('Employee ID must be a valid UUID'),
});

// ── POST /api/payments/payouts — Request Payout ──
export const POST = apiHandler({
  schema: payoutRequestSchema,
  //      ^^^^^^^^^^^^^^^^^^^^^^ FIX: Body is validated before the handler runs.
  //      If validation fails, the wrapper returns 400 with a clear message.
  //      The handler never receives invalid data.
  requireAuth: true,
  allowedRoles: ['EMPLOYEE'],
  //      ^^^^^^^^^^^^^^^^^ FIX: Only employees can request payouts.
  //      If a student sends this request, they get 403 with "Access denied".

  handler: async ({ body }) => {
    const { employeeId } = body;
    // ^^^ `body` is typed as { employeeId: string } — no need for runtime checks

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all completed bookings with PENDING payout status
    const pendingBookings = await prisma.booking.findMany({
      where: {
        employeeId,
        status: 'COMPLETED',
        payoutStatus: 'PENDING',
      },
    });

    if (pendingBookings.length === 0) {
      return success({ message: 'No pending payouts found' });
      // ^^^ success() helper returns { success: true, data: { message: "..." } }
    }

    // Calculate payout
    const totalAmount = pendingBookings.reduce(
      (sum, booking) => sum + booking.amountPaid,
      0
    );
    const payoutAmount = Math.round(totalAmount * 0.8);

    // Update bookings to PROCESSING
    await prisma.booking.updateMany({
      where: { id: { in: pendingBookings.map((b) => b.id) } },
      data: { payoutStatus: 'PROCESSING' },
    });

    return success(
      {
        message: 'Payout request created successfully',
        payoutAmount,
        bookingCount: pendingBookings.length,
        bookingIds: pendingBookings.map((b) => b.id),
      },
      200
    );
    // ^^^ Every success path returns { success: true, data: { ... } }
    //    Every error path returns { success: false, error: "...", code: "..." }
    //    Frontend can write ONE handler for all API responses.
  },
});

// ── GET /api/payments/payouts — View Payout Status ──
export const GET = apiHandler({
  schema: payoutQuerySchema,
  validateQuery: true,
  //      ^^^^^^^^^^^^^^^ FIX: Validates query params instead of body
  requireAuth: true,
  allowedRoles: ['EMPLOYEE'],

  handler: async ({ body }) => {
    const { employeeId } = body;
    // body is typed as { employeeId: string }

    const employee = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: { employeeId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    });

    const totalEarnings = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const pendingPayouts = bookings
      .filter((b) => b.payoutStatus === 'PENDING')
      .reduce((sum, b) => sum + b.amountPaid, 0);
    const processingPayouts = bookings
      .filter((b) => b.payoutStatus === 'PROCESSING')
      .reduce((sum, b) => sum + b.amountPaid, 0);
    const paidPayouts = bookings
      .filter((b) => b.payoutStatus === 'PAID')
      .reduce((sum, b) => sum + b.amountPaid, 0);

    return success({
      totalEarnings,
      pendingPayouts,
      processingPayouts,
      paidPayouts,
      availableForPayout: pendingPayouts,
    });
  },
});
```

**Changes summary for Example 3:**

| Aspect | Before | After |
|---|---|---|
| **Prisma instance** | `new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| **Input validation** | Inline `if (!employeeId)` — allows `null`, objects, undefined | Zod schema — `z.string().uuid()` — rejects everything invalid |
| **Error shape** | `{ error: "..." }` or `(error as Error).message` | `{ success: false, error: "...", code: "NOT_FOUND" }` |
| **Success shape** | `{ message, payoutAmount, ... }` | `{ success: true, data: { ... } }` |
| **Auth check** | None (anyone can call this) | `requireAuth: true` + `allowedRoles: ['EMPLOYEE']` |
| **Error leak** | `(error as Error).message` in production | In production: `"An unexpected error occurred"`. In dev: actual message. |
| **Boilerplate** | ~80 lines with try/catch, inline checks, ad-hoc responses | ~45 lines — pure business logic |

---

## Integration Checklist

When adopting the `apiHandler()` wrapper in any existing route:

1. **Replace imports**: `import { apiHandler, success } from '@/lib/api-handler'`
2. **Replace Prisma import**: `import { PrismaClient }` → `import { prisma } from '@/lib/db'`
3. **Define schema**: Create a `z.object(...)` matching the expected input shape
4. **Wrap handler**: Change `export async function GET/POST` to `export const GET/POST = apiHandler({ schema, handler: ... })`
5. **Remove dead code**: Delete inline `try/catch`, `if (!x) return error`, and `error.message` fallbacks — the wrapper handles them
6. **Return `success(data)`**: Replace `NextResponse.json({ bookings })` with `success({ bookings })`
