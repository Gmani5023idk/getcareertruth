# API Route Reliability — Step-by-Step Fix Plan

## Current Problems Identified

```
1. PrismaClient misuse   → 6 routes use `new PrismaClient()` instead of the singleton
2. Error shape variance  → { error } | { error, detail } | { error, message } | raw text fallback
3. Missing validation    → Some Zod, some custom sanitize, some inline checks, some none
4. Silent failures       → Zoom/Email/AI fail → booking proceeds with null meeting link, no user feedback
```

---

## Phase 1 — Foundation (Prisma Singleton + Consistent Error Handler)

**Rationale:** Fix the infrastructure layer first so every route benefits immediately. No business logic changes — purely mechanical, safe to deploy incrementally.

### Step 1.1 — Migrate all `new PrismaClient()` to the shared singleton

**Why first:** Every `new PrismaClient()` creates a new connection pool. Under concurrent load (e.g., 500+ users signing up, each hitting OTP + upload-id + signup routes), this exhausts Neon's connection limit. The singleton from `lib/db.ts` reuses the existing pool via `globalThis`.

**Files to fix:**

| File | Current | Fix |
|---|---|---|
| `app/api/transcripts/route.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| `app/api/transcripts/process/route.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| `app/api/auth/verify-college-email/route.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| `app/api/auth/otp/route.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| `app/api/auth/upload-id/route.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| `app/api/payments/payouts/route.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |
| `lib/skill-recommendations.ts` | `const prisma = new PrismaClient()` | `import { prisma } from '@/lib/db'` |

**Risks:** None — `lib/db.ts` exports a PrismaClient with the exact same API. Zero behavioral change.

### Step 1.2 — Build the `apiHandler()` wrapper (see Output 2)

**Why second:** This wrapper eliminates the error-shape inconsistency in a single file. Every route that adopts it immediately returns `{ success: false, error, code }` on failure instead of ad-hoc `{ error }` or `{ error, message }`.

**What it does:**
- Wraps every handler in a typed `try/catch`
- Returns a stable error shape: `{ success: false, error: string, detail?: string, code?: number }`
- Catches unexpected errors + returns 500 with `INTERNAL_ERROR` code
- Support Zod schema integration (see Phase 2)
- Support auth checks via `requireAuth` option

### Step 1.3 — Adopt the wrapper in 3–5 high-traffic routes

Pick routes that are easy to test (GET-only first, then POST):
1. `app/api/employees/route.ts` — GET, no auth, no validation needed
2. `app/api/mentors/route.ts` — GET, no auth
3. `app/api/bookings/route.ts` — GET + POST, auth needed
4. `app/api/reviews/route.ts` — POST, auth needed
5. `app/api/payments/payouts/route.ts` — GET + POST

**Testing each:** Verify the route returns `{ success: true, data: ... }` on success and `{ success: false, error: ... }` on failure with matching HTTP status codes.

---

## Phase 2 — Input Validation (Zod Schema Integration)

**Rationale:** Routes like `payouts/route.ts` and `employees/route.ts` accept raw body/query params without any structural validation. An attacker sending `{ employeeId: null }` or `{ employeeId: { $gt: '' } }` propagates malformed data into Prisma queries, causing 500s or unexpected behavior.

### Step 2.1 — Add Zod schemas for every route's expected input

**Where schemas should live:**
- Reusable schemas → `shared/schemas/` (e.g., `booking.schema.ts`, `payout.schema.ts`)
- Route-specific → inline in the route file or in `shared/schemas/api/`

**Route schemas needed:**

| Route | Input | Current validation |
|---|---|---|
| `bookings/route.ts` (POST) | `{ employeeId, scheduledAt, durationMins, topic, notes, amountPaid }` | Inline null check only |
| `review/route.ts` (POST) | `{ bookingId, rating, text, isPublic }` | Inline null check only |
| `payouts/route.ts` (POST) | `{ employeeId }` | Inline null check only |
| `employees/route.ts` (GET) | query: `industry, minPrice, maxPrice, search` | None |
| `mentors/route.ts` (GET) | query: `domain, sort` | None |
| `bookings/[id]/approve/route.ts` (PUT) | route param: `id` | None |
| `transcripts/route.ts` (POST) | `{ action, bookingId, content, summary, keyPoints }` | Inline check |

### Step 2.2 — Integrate Zod schemas into `apiHandler()`

The wrapper's `schema` option auto-validates before the handler runs:

```typescript
export const GET = apiHandler({
  schema: employeeQuerySchema,       // validates query params
  handler: async ({ req }) => { ... }
});
```

On failure: returns `{ success: false, error: "Validation failed", detail: "...", code: "VALIDATION_ERROR" }` with status 400.

**Validation for:**
- POST/PUT requests → validates `req.json()` body
- GET requests → validates `req.nextUrl.searchParams`
- Nested/optional fields → `z.object({ x: z.string().optional() })`

### Step 2.3 — Remove now-redundant inline validation

After a route adopts the Zod schema + `apiHandler()`, delete the inline `if (!xxx) return NextResponse.json(...)` checks. They're dead code — the schema validates first.

---

## Phase 3 — Silent Failure Elimination (Zoom / Email / AI)

**Rationale:** `lib/bookings.ts` is the most critical file. It runs after payment confirmation. If Zoom creation fails, the booking proceeds with `meetingLink = undefined`. The user pays but gets no meeting link. No admin alert. No retry.

### Step 3.1 — Fix `lib/bookings.ts`: surface Zoom/Email failures as booking errors

**Current (silent):**
```typescript
try { meeting = await createZoomMeeting(...); } catch (error) {
  console.error('Failed to create Zoom meeting:', error);
  // meetingLink stays undefined — silent failure
}
```

**Fix:** Store the failure mode on the booking record so the frontend can show a meaningful state:

```typescript
// Store a "pending" status for Zoom so a cron/retry can pick it up
await prisma.booking.update({
  where: { id: bookingId },
  data: {
    meetingStatus: 'FAILED',
    meetingError: (error as Error).message,
  }
});
// Then either throw to fail the webhook (safe, Razorpay retries)
// Or return null meetingLink + let a separate cron retry Zoom creation
```

**Design choice:** The webhook handler should throw on Zoom failure (not silent catch) so Razorpay retries the webhook. Add a retry budget (max 3 attempts) to avoid infinite retries.

### Step 3.2 — Fix `app/api/cron/process-sessions/route.ts`: AI processing fallback

**Current:** AI processing is wrapped in a silent try/catch — if OpenAI is down, no feedback, no retry.

```typescript
try {
  const aiResults = await processTranscript(transcriptContent);
  // ... update transcript with AI data ...
} catch (aiErr) {
  console.error(`AI processing failed for booking ${booking.id}:`, aiErr);
  // No feedback to user, no retry marker
}
```

**Fix:** Store the AI failure on the transcript record:

```typescript
await prisma.transcript.update({
  where: { id: transcript.id },
  data: {
    aiStatus: 'FAILED',
    aiError: (aiErr as Error).message,
    // Keep existing content + mark for retry
  }
});
```

Add a `aiStatus` column (enum: `PENDING | PROCESSING | COMPLETED | FAILED`) to the Transcript schema. A separate cron retries `FAILED` transcripts with exponential backoff.

### Step 3.3 — Add retry-ability (database-level)

**New columns needed in Prisma schema:**

```prisma
model Booking {
  // ... existing fields ...
  meetingStatus  MeetingStatus?  @default(PENDING)
  meetingError   String?
  meetingRetryAt DateTime?        // next retry time (backoff)
}

model Transcript {
  // ... existing fields ...
  aiStatus       TranscriptAIStatus @default(PENDING)
  aiError        String?
  aiRetryAt      DateTime?          // next retry time
}

enum MeetingStatus {
  PENDING
  CREATED
  FAILED
}

enum TranscriptAIStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### Step 3.4 — Add a retry cron job

Create `app/api/cron/retry-zoom/route.ts` and `app/api/cron/retry-ai/route.ts`:

```typescript
// Runs every 5 minutes. Picks up bookings with meetingStatus = 'FAILED' 
// where meetingRetryAt < now. Retries Zoom creation. Max 3 attempts.
// If all attempts exhausted → triggers admin notification.
```

### Step 3.5 — Surface failures in the admin dashboard

Add a "Failed Operations" section to `app/admin/page.tsx` showing:
- Bookings with `meetingStatus = 'FAILED'` — retry button
- Transcripts with `aiStatus = 'FAILED'` — retry button

---

## Priority Matrix

| Phase | Effort | Impact | Risk | Timeline |
|---|---|---|---|---|
| Phase 1 | Low (simple imports + wrapper) | High (every route benefits) | None | Day 1 |
| Phase 2 | Medium (write schemas + integrate) | High (prevents injection/errors) | Low | Day 2 |
| Phase 3 | Medium-High (new DB columns + cron) | Critical (payment integrity) | Low | Day 3 |

**Recommended order:** Phase 1 → Phase 2 → Phase 3 (strict), because Phase 1 infrastructure is a prerequisite for Phase 2's schema validation, and Phase 3 depends on the error-handling patterns from Phase 1.

---

## Rollback Strategy

Each phase produces atomic commits:
1. **Phase 1:** The `apiHandler()` wrapper is new code — zero risk to existing routes. Rollback by reverting the import changes.
2. **Phase 2:** Zod schemas are additive — if a schema is too strict, the error is a 400 with a clear message, not a 500. Rollback by removing the `schema` option from the handler.
3. **Phase 3:** New DB columns are optional — treat them as nullable. Rollback by removing the cron jobs.

No deploy requires coordination across phases.
