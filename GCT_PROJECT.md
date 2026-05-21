# GetCareerTruth (GCT) Project Documentation

## Project Overview

GetCareerTruth is a career counseling platform connecting students and parents with industry professionals for paid one-on-one video sessions. The platform handles user registration, profile management, session booking, Razorpay payments, automated Zoom meeting creation, and post-session transcripts/reviews.

**Key Goals:**
- Provide verifiable industry insights
- Secure payment processing
- Automated scheduling & Zoom integration
- Transcripts and AI summaries
- Review system for mentors

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS |
| **ORM** | Prisma (PostgreSQL) |
| **Database** | Neon PostgreSQL (serverless) |
| **Auth** | NextAuth.js (custom adapter) |
| **Payments** | Razorpay |
| **Video** | Zoom API |
| **Email** | Resend |
| **Deployment** | Vercel (frontend), Neon (DB) |

---

## Project Structure

```
/home/manikanta/getcareertruth/
├── app/
│   ├── (public)/           # Public pages (no auth)
│   │   ├── login/
│   │   ├── register/
│   │   ├── student/
│   │   ├── parent/
│   │   ├── employee/
│   │   ├── booking/
│   │   └── ...
│   ├── (dashboard)/        # Protected dashboard pages
│   │   ├── student/
│   │   ├── parent/
│   │   ├── employee/
│   │   └── admin/
│   ├── api/                # API routes
│   │   ├── auth/
│   │   ├── payments/
│   │   ├── bookings/
│   │   └── ...
│   └── ...
├── components/             # React components
├── lib/                    # Utilities, Prisma client, APIs
├── prisma/
│   ├── schema.prisma       # DB schema
│   └── seed.ts             # Optional seed data
├── public/                 # Static assets
├── .env                    # Environment variables (.local)
├── next.config.js
└── package.json
```

---

## Database Schema (Prisma)

### Core Models

#### User
```
id (String, PK)
email (String, unique)
phone?
passwordHash?
googleId? (unique)
role (enum: STUDENT, EMPLOYEE, PARENT)
isEmailVerified (Boolean)
profilePhoto?
createdAt, updatedAt
```

#### StudentProfile / EmployeeProfile / ParentProfile
One-to-one with User, storing role-specific data.

#### Booking
```
id (String, PK)
studentId? (fk→User.id)
parentId?  (fk→User.id)
employeeId (fk→User.id)
scheduledAt (DateTime)
durationMins (Int, default 15)
status (BookingStatus)
topic?
meetingLink?
razorpayOrderId?
razorpayPaymentId?
amountPaid (Int)
platformFee?
employeePayout?
payoutStatus (PayoutStatus)
studentMarkedComplete (Boolean)
employeeMarkedComplete (Boolean)
completedAt?
cancelledAt?
cancelReason?
reminderSentAt?
refundAmount?
conversationId? (fk→Conversation.id, @unique)
review? (1:1 → Review)
transcript? (1:1 → Transcript)
createdAt, updatedAt
@@unique([employeeId, scheduledAt])
```

#### Conversation
```
id (String, PK)
type (ConversationType: STUDENT_STUDENT, PARENT_PARENT, STUDENT_EMPLOYEE, PARENT_EMPLOYEE)
booking? (1:1 → Booking)
participants (ConversationParticipant[])
messages (ChatMessage[])
createdAt, updatedAt
```

#### ChatMessage, ConversationParticipant, Review, Transcript
See `prisma/schema.prisma` for full definitions.

---

## API Routes

### Authentication
- `POST /api/auth/register` – user registration (student/parent/employee)
- `POST /api/auth/login` – login
- `POST /api/auth/logout` – logout
- `GET  /api/auth/session` – current session
- `POST /api/auth/verify-college-email` – verify college email for students

### Payments
- `POST /api/payments/create-order` – creates Razorpay order for a booking
- `POST /api/payments/verify` – verifies Razorpay signature, confirms booking, creates Zoom meeting & conversation, sends emails
- `POST /api/payments/webhook` – Razorpay webhook (handles payment failures, refunds, etc.)

### Bookings
- `GET  /api/bookings` – list bookings (with filters by role/status)
- `POST /api/bookings` – create a new booking (from student/parent side)
- `PUT  /api/bookings/:id/approve` – employee approves booking (sets CONFIRMED)
- `PUT  /api/bookings/:id/cancel` – cancel a booking

### Employee-specific (Dashboard)
- `GET /api/employee/bookings` – employee’s bookings with filters (upcoming, past, pending)

---

## Current Implementation Status

| Task | Status |
|------|--------|
| 1. Fix payments/verify endpoint to align with Booking schema | ✅ Done |
| 2. Create bookings API route (POST /api/bookings) | ✅ Done |
| 3. Create employee-specific bookings API (GET /api/bookings) | ✅ Done |
| 4. Modify payments/create-order to accept bookingId and create order | ✅ Done |
| 5. Implement Zoom meeting creation utility (`/lib/zoom.ts`) | ✅ Done |
| 6. Create email notification utility using Resend (`/lib/email.ts`) | ✅ Done |
| 7. Update payments/webhook to confirm booking & trigger Zoom + chat | ✅ Done |
| 8. Add booking approval endpoint (PUT /api/bookings/:id/approve) | ✅ Done |
| 9. Add booking cancellation endpoint (PUT /api/bookings/:id/cancel) | ✅ Done |
| 10. Create student booking form page (`/app/(public)/book/[employeeId]/page.tsx`) | ✅ Done |
| 11. Enhance booking confirmation page (`/app/(public)/booking/[id]/page.tsx`) | ✅ Done |
| 12. Enhance employee dashboard (`/app/(dashboard)/employee/page.tsx`) | ✅ Done |
| 13. Create session chat page with real data and session validation | ✅ Done |
| 14. Implement session end processing (cron or manual endpoint) | ⏳ Pending |
| 15. Implement auto-notify for inactive employees (24h reminder) | ⏳ Pending |
| 16. Test complete end-to-end flow | ⏳ Pending |

---

## Key Flows

### Booking Flow (Student/Parent)

1. Browse employee profiles
2. Select slot → create Booking (status: `PENDING_CONFIRM` or `PENDING_PAYMENT` depending on business rule)
3. Razorpay order created → payment popup
4. Payment verified (`/api/payments/verify`)
   - Update Booking: `status = CONFIRMED`
   - Create Zoom meeting → store `meetingLink`
   - Create Conversation (type based on student/parent + employee)
   - Link `conversationId` to Booking
   - Send confirmation emails (employee & student/parent)
5. Student joins via meeting link at scheduled time
6. After session, employee or student marks complete → `completedAt` set
7. Optional: transcript generated, review requested

### Employee Workflow

- Login → Dashboard shows upcoming bookings, pending requests
- For each booking, employee can approve/reject (if not auto-approved after payment)
- At session time, join Zoom
- After session, mark complete
- Wait for student review (optional)
- Payout processing (Razorpay)

---

## Environment Variables (.env)

```env
# Database
DATABASE_URL="postgresql://neondb_owner:npg_...@ep-orange-smoke-aju02sog.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Razorpay
RAZORPAY_KEY_ID="your_key_id"
RAZORPAY_KEY_SECRET="your_key_secret"

# Zoom
ZOOM_ACCOUNT_ID="your_account_id"
ZOOM_CLIENT_ID="your_client_id"
ZOOM_CLIENT_SECRET="your_client_secret"

# Resend (emails)
RESEND_API_KEY="re_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Push DB schema
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Run dev server
npm run dev
# → http://localhost:3000
```

---

## Notes & Pitfalls

- **Foreign key constraints**: Booking → Conversation is one-to-one via `conversationId @unique`. Ensure both sides of Prisma relations are properly defined.
- **Field names**: Use `fullName` from profiles, not `name` on User.
- **Zoom meeting creation**: Must happen after payment verification to avoid orphan meetings.
- **Email templates**: Update Resend templates to match data shape.
- **Razorpay webhook**: Needs signature verification and proper event handling.
- **Timezone handling**: Store `scheduledAt` in UTC, display in user local time.
- **Idempotency**: Verify that retrying webhook/verify calls doesn't duplicate resources.

---

## Next Steps (Short-term)

1. Implement `POST /api/bookings` – create booking with Razorpay order
2. Implement `GET /api/bookings?role=employee` with status filters
3. Update `payments/create-order` to accept `bookingId`
4. Build `lib/zoom.ts` wrapper (OAuth → create meeting)
5. Build `lib/email.ts` Resend wrapper (templates for payment confirmed, meeting created, etc.)
6. Update `payments/webhook` to handle `payment.captured` → confirm booking if not already
7. Add `PUT /api/bookings/:id/approve` and `cancel` endpoints
8. Build front-end booking flow pages
9. Implement dashboard pages with real data
10. Build chat interface with real-time updates

---

## Design & Branding

- **Logo**: Custom image `/public/getcareertruth-text-image.png` (replaces text logo)
- **Icon logo**: `/public/gct-logo.png` (32x32)
- **Colors**: Primary deep blue / teal (define in Tailwind config)
- **Styling**: Utility-first Tailwind; keep consistent spacing and typography scale

---

## References

- Prisma Schema: `/home/manikanta/getcareertruth/prisma/schema.prisma`
- Next.js App Router docs
- Razorpay docs: https://razorpay.com/docs
- Zoom API: https://marketplace.zoom.us/docs/api-reference/zoom-api
- Resend: https://resend.com/docs

---

*Last updated: 2025-05-06*