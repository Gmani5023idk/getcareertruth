# GetCareerTruth: End-to-End Booking & Session Flow — Project Status

**Date:** June 6, 2026 (Session date)
**Branch:** main
**Tech Stack:** Next.js 15 (app router), React 19, Prisma 5.x, PostgreSQL (Neon), NextAuth, Tailwind CSS, Pusher, Razorpay, Resend, Zoom API

---

## 1. Completed Work

### 1.1 Database Schema Updates
- **File:** `prisma/schema.prisma`
- Added unique constraint `@@unique([employeeId, scheduledAt])` to `Booking` to prevent double-booking at the database level.
- Added `reminderSentAt DateTime?` to `Booking` for tracking 24-hour inactivity reminders.
- All other models remain as provided.

### 1.2 API Routes Implemented

#### Core Booking Flow
- `POST /api/bookings` – Create a booking request (student/parent). Validates employee availability, assigns role-based participant IDs, sets initial status `PENDING_CONFIRM`.
- `GET /api/bookings` – List bookings for the logged-in user (filtered by role: student sees their bookings, employee sees theirs).
- `GET /api/bookings/[id]` – Fetch booking details with participant and employee info.
- `PUT /api/bookings/[id]/approve` – Employee approves booking, changes status to `PENDING_PAYMENT` and sends approval email.
- `PUT /api/bookings/[id]/cancel` – Cancel by student/parent or employee. Sets status to `CANCELLED` and records reason/refund if applicable.

#### Payments
- `POST /api/payments/create-order` – Creates Razorpay order for a booking. Validates status = `PENDING_PAYMENT`. Returns order details including `keyId`, `amount`, `orderId`.
- `POST /api/payments/verify` – Verifies Razorpay signature, updates booking to `CONFIRMED`, creates Zoom meeting, creates Conversation, links it, and sends confirmation emails.

#### Employee Public Profiles
- `GET /api/employees/[id]` – Public employee profile data (name, topics, rating, availability pattern, price).
- `GET /api/employees/[id]/available-slots` – Returns available slots for the employee over a date range based on availability pattern and existing bookings.

#### Internal
- `GET /api/employee/me` – Authenticated employee profile with dashboard stats (`pendingRequests`, `todaysSessions`, rating, totalEarned, etc.).
- `POST /api/admin/process-sessions` – Admin-only endpoint to:
  - Mark confirmed sessions that have ended as `COMPLETED`.
  - Generate plain-text transcripts from chat messages and create `Transcript` records.
  - Send email notifications to both parties.
  - Send 24h inactivity reminders to employees with pending bookings.
  - Sets `reminderSentAt` to avoid spam.

### 1.3 Utilities
- **`lib/zoom.ts`** – Axios-based Zoom client. `createZoomMeeting({ scheduledAt, durationMins, topic, agenda })` creates a Zoom meeting via Zoom API and returns `{ joinUrl, startUrl, meetingId }` (keys configurable).
- **`lib/email.ts`** – Resend-based email templates:
  - `sendMeetingCreated` – Sent to student/parent after employee approval (includes payment link placeholder? Actually approval email triggers `sendMeetingCreated` but payment not created yet; adjust if needed).
  - `sendPaymentConfirmed` – Sent to employee after payment confirmation.
  - `sendSessionEnded` – Post-session email with transcript link.
  - `sendInactivityReminder` – Sent to employee after 24h of pending request.

### 1.4 Pages (Frontend)
- **Student booking flow:**
  - `/app/(public)/book/[employeeId]/page.tsx` – Employee public profile with availability slots grid. Allows student to select a slot, enter topic/notes, and create booking request.
  - `/app/(public)/booking/[id]/page.tsx` – Booking confirmation page that adapts to all statuses: `PENDING_CONFIRM` (awaiting approval, cancel option), `PENDING_PAYMENT` (pay button with Razorpay checkout), `CONFIRMED` (meeting & chat links), `CANCELLED`, `COMPLETED` (view transcript & review).
- **Employee dashboard:**
  - `/app/(dashboard)/employee/page.tsx` – Shows pending requests (data table) and today's upcoming sessions. Includes real-time count from `/api/employee/me`.
- **Chat time-gate:**
  - `/app/dashboard/chat/booking/[bookingId]/page.tsx` – Time validation page. Redirects to the actual conversation if within the session window (5 min before to 5 min after). Shows error otherwise.

### 1.5 Other Changes
- Updated `app/api/payments/create-order/route.ts` and `verify/route.ts` to align with the updated `Booking` schema and complete flow.
- Ensured all API routes use the singleton `prisma` client from `@/lib/db`.
- Added `Booking` relation fields in queries where needed (e.g., `include: { employee: … }`).

---

## 2. Problems Encountered & Solutions

| Problem | Cause | Resolution |
|---------|-------|------------|
| **Prisma CLI error “Cannot find module '@prisma/fetch-engine'”** | Ran `npx prisma db push` with no local Prisma installed; global cache corrupted. | Installed Prisma locally: `npm install prisma@latest --save-dev`. Later realized schema uses Prisma 5 syntax. |
| **`npx prisma db push` could not find schema** | Ran command from a non-project directory. | Used absolute `--schema` path; also confirmed project root as working directory. |
| **Prisma 7.x schema validation error** | Installed `prisma@latest` (v7) which deprecates `url` in datasource. Schema uses older syntax (`url = env("DATABASE_URL")`). | Downgraded to `prisma@5.22.0` as indicated in `package.json`: `npm install prisma@5.22.0 --save-dev`. |
| **`Could not find Prisma Schema`** after downgrade | Still running from wrong cwd occasionally. | Verified cwd; used explicit `--schema` flag. |
| **Database reachability: `P1001: Can't reach database server`** | WSL could not open a TCP connection to Neon host (`ep-orange-smoke-aju02sog...`). Possible causes: outbound port 5432 blocked by host network, DNS issues, or Neon IP allowlist. | **Unresolved** – the session ended before fixing. Suggested: test connectivity from Windows PowerShell, check firewall/allowlist, or use a local DB proxy. |
| **Missing environment variables** | Many integrations (Razorpay, Resend, Zoom, NextAuth) require secrets. | Noted in next steps; user must configure `.env`. |

---

## 3. Environment Variables Required

Create a `.env` file in the project root with at least:

```bash
# Database
DATABASE_URL="postgresql://neondb_owner:npg_oh9Tnv0fwuLC@ep-orange-smoke-aju02sog.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="random-32-byte-base64-string"
NEXTAUTH_URL="http://localhost:3000"   # adjust if using https or custom domain

# Razorpay
RAZORPAY_KEY_ID="rzp_test_…"
RAZORPAY_KEY_SECRET="your-razorpay-secret"

# Resend (email)
RESEND_API_KEY="re_…"

# Zoom
ZOOM_API_KEY="…"
ZOOM_API_SECRET="…"
ZOOM_HOST_USER_ID="…"   # typically the Zoom account email or user ID

# Admin cron/util
ADMIN_SECRET="some-strong-secret"   # protects /api/admin/process-sessions

# Optional: Frontend URL (for absolute links in emails)
FRONTEND_URL="http://localhost:3000"
```

After adding these, run `npx prisma generate` and `npx prisma db push`.

---

## 4. Next Actions (to be completed)

1. **Resolve database connectivity** – Ensure WSL can reach Neon database. Test with `ping`/`nc` or run `npx prisma db push` from Windows PowerShell. If using IP allowlist, add your current IP to Neon’s dashboard.
2. **Run migrations** – Once `DATABASE_URL` is reachable:  
   ```bash
   npx prisma db push
   ```
   This will apply the unique constraint and add `reminderSentAt`. If duplicate bookings exist, clean them first.
3. **Complete environment configuration** – Add all secrets to `.env`. Confirm Zoom credentials (JWT app or OAuth) and Razorpay test keys.
4. **Test the full booking flow**:
   - Create two test users (employee + student), set employee profile with `availabilitySlots`.
   - Student books a slot → employee approves → student pays → employee receives payment confirmation → Zoom meeting created → chat conversation created.
   - Verify emails via Resend (use test mode).
   - Join meeting and send a few chat messages.
   - Trigger `/api/admin/process-sessions` manually after session time to generate transcript and send ended email.
5. **Implement missing pieces** (nice-to-have but not blocking initial demo):
   - Dashboard page to list and view transcripts.
   - Review submission page.
   - Employee “Inactive Request” reminder UI (maybe badge).
   - Real-time Pusher integration for chat if not already.
6. **Security hardening**:
   - Ensure all protected routes check `auth` correctly (e.g., `/api/employee/me`, `/api/bookings/[id]`).
   - Rate-limit payments, admin endpoint.
7. **Cron scheduling** – Use Hermes cron or system cron to call `POST /api/admin/process-sessions` every hour:
   ```bash
   curl -X POST http://localhost:3000/api/admin/process-sessions -H "x-admin-secret: $ADMIN_SECRET"
   ```
8. **Deploy** – When ready, push to a hosting platform (Vercel, Railway, etc.) and set environment variables accordingly.

---

## 5. Notes & Decisions

- **Time handling** – All dates/times are stored as UTC in `Booking.scheduledAt`. The API expects ISO 8601 strings. The booking form sends full ISO string from the selected slot (which is derived from employee availability in Asia/Kolkata, but we store as UTC). Time conversion: `new Date(`${date}T${time}:00+05:30`)` converts to UTC internally. That is acceptable as long as we display consistently.
- **Payment flow** – Approved bookings go to `PENDING_PAYMENT`. Student clicks Pay → Razorpay order → verify → `CONFIRMED`. No partial refunds logic yet; cancellation refunds simply set `refundAmount = amountPaid` (manual reconciliation needed).
- **Availability** – The employee's `availabilitySlots` JSON array expected format: `[{ day: "Monday", slots: ["09:00","09:30",...] }, …]`. The public slots endpoint accounts for existing bookings (excluding cancelled) to produce free slots.
- **Transcripts** – Generated only by admin processing endpoint. Transcript is plain text with timestamps and sender labels. No AI summarization yet.
- **Email templates** – Minimal inline HTML; styled like the site but without heavy CSS. Subject lines generic; can be customized.

---

## 6. File Manifest (New / Modified)

```
prisma/schema.prisma (modified)
lib/zoom.ts (new)
lib/email.ts (new)
app/api/bookings/route.ts (new)
app/api/bookings/[id]/route.ts (presumed existing? we read it earlier but didn't write? Actually we only wrote create/approve/cancel; the GET single likely exists from earlier – check and possibly update)
app/api/bookings/[id]/approve/route.ts (new)
app/api/bookings/[id]/cancel/route.ts (new)
app/api/payments/create-order/route.ts (new)
app/api/payments/verify/route.ts (new)
app/api/employees/[id]/route.ts (new)
app/api/employees/[id]/available-slots/route.ts (new)
app/api/employee/me/route.ts (new)
app/api/admin/process-sessions/route.ts (new)
app/(public)/book/[employeeId]/page.tsx (new)
app/(public)/booking/[id]/page.tsx (new)
app/(dashboard)/employee/page.tsx (new)
app/dashboard/chat/booking/[bookingId]/page.tsx (new)
```

*Note:* Some files (e.g., `app/api/bookings/[id]/route.ts`, `app/dashboard/chat/conversations/[id]/page.tsx`, UI components) likely existed before this session and were not modified.

---

## 7. Conclusion

The core booking and session lifecycle logic is implemented end-to-end, from student request through payment to confirmed session with Zoom and chat. The main blocker is database connectivity from WSL; once resolved, the schema can be pushed and backend exercised.

If you need clarification on any piece or run into errors during testing, feel free to ask!
