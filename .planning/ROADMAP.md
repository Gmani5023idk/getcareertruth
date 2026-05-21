# Project Roadmap: GetCareerTruth

## Project Vision
GetCareerTruth is a career counseling platform connecting students and parents with industry professionals for paid one-on-one video sessions. The platform provides verifiable industry insights through secure payments, automated scheduling, and AI-enhanced post-session resources.

## Technical Stack
- **Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS
- **ORM**: Prisma 5.x (PostgreSQL via Neon)
- **Authentication**: NextAuth.js
- **Payments**: Razorpay
- **Video**: Zoom API
- **Email**: Resend
- **Real-time**: Pusher (for chat)

## Phases

- [x] **Phase 1: Foundation & Auth** - Core user models and secure authentication.
- [x] **Phase 2: Booking Flow** - Discovery and scheduling of sessions.
- [x] **Phase 3: Payment & Automated Setup** - Secure payments and automated logistics.
- [x] **Phase 4: Live Session Experience** - Premium interface and real-time communication.
- [ ] **Phase 5: Automation & Post-Session** - Maintenance tasks and feedback loop.
- [ ] **Phase 6: Production Readiness** - Testing, security, and deployment.

---

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Establish core user models and secure authentication.
**Depends on**: Initial project scaffolding
**Requirements**: AUTH-01, AUTH-02, AUTH-03, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. User can register and login as student/parent/employee.
  2. College email verification works for students.
  3. Profiles are persistent in the database and editable.
**Plans**: Completed

### Phase 2: Booking Flow
**Goal**: Enable the discovery and scheduling of sessions.
**Depends on**: Phase 1
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Student can browse employee profiles and see real-time availability slots.
  2. Booking request can be created and immediately appears on the employee's dashboard.
  3. Employee can approve or reject the request, with status reflected for the student.
**Plans**: Completed
**UI hint**: yes

### Phase 3: Payment & Automated Setup
**Goal**: Secure the booking with payment and automate logistics.
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03, SESS-01, SESS-02, SESS-03
**Success Criteria** (what must be TRUE):
  1. Razorpay checkout opens correctly for approved bookings.
  2. Upon successful payment, a Zoom meeting is automatically created via API.
  3. Automated confirmation emails with meeting links are sent to both parties.
**Plans**: Completed (Logic implemented, needs verification with live keys)

### Phase 4: Live Session Experience
**Goal**: Provide a premium interface for the session and real-time communication.
**Depends on**: Phase 3
**Requirements**: COMM-01, COMM-02, SESS-04, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. User sees the premium dark theme across all session-related pages.
  2. Real-time chat (Pusher) works within the session window (time-gated).
  3. Dashboards show correct status updates for active and upcoming sessions.
**Plans**: Completed
**UI hint**: yes

### Phase 5: Automation & Post-Session
**Goal**: Automate maintenance tasks and gather feedback.
**Depends on**: Phase 4
**Requirements**: SESS-05, SESS-06, REV-01, REV-02, REV-03
**Success Criteria** (what must be TRUE):
  1. Sessions are automatically marked complete via cron/admin endpoint after they end.
  2. Transcripts and AI summaries are generated and available in the dashboard.
  3. Students can leave reviews and ratings for employees post-session.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Production Readiness
**Goal**: Ensure the system is robust, secure, and ready for real users.
**Depends on**: Phase 5
**Requirements**: All (End-to-End Validation)
**Success Criteria** (what must be TRUE):
  1. End-to-end test flow passes (Request -> Approve -> Pay -> Meet -> Complete).
  2. Database connectivity is stable and environment variables are properly managed.
  3. Security audits pass for sensitive endpoints (payments, admin).
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 1/1 | Completed | 2026-05-15 |
| 2. Booking Flow | 1/1 | Completed | 2026-05-20 |
| 3. Payment & Setup | 1/1 | Completed | 2026-06-01 |
| 4. Session Experience | 1/1 | Completed | 2026-06-05 |
| 5. Automation & Post | 0/1 | Not started | - |
| 6. Production Readiness | 0/1 | Not started | - |
