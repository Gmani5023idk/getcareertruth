# Requirements

## v1 Requirements

### Authentication (AUTH)
- **AUTH-01**: User registration for students, parents, and employees.
- **AUTH-02**: User login/logout via NextAuth.
- **AUTH-03**: College email verification for students.

### Profile Management (PROF)
- **PROF-01**: Student profile management (education, interests).
- **PROF-02**: Employee profile management (company, role, topics, availability).
- **PROF-03**: Parent profile management.

### Booking (BOOK)
- **BOOK-01**: Browse employee profiles with filters.
- **BOOK-02**: Select slot and create booking request.
- **BOOK-03**: Employee can approve or reject booking requests.
- **BOOK-04**: Students and employees can cancel bookings with reason.

### Payments (PAY)
- **PAY-01**: Create Razorpay order for booking (v4 signatures).
- **PAY-02**: Verify Razorpay payment and confirm booking.
- **PAY-03**: Razorpay webhook for payment captured, failed, and refunds.

### Video/Session (SESS)
- **SESS-01**: Automated Zoom meeting creation after payment.
- **SESS-02**: Meeting links stored in booking and displayed in dashboard.
- **SESS-03**: Automated emails for session details (confirmation, link, reminders).
- **SESS-04**: Mark session as complete (employee/student).
- **SESS-05**: Automated session end processing (mark completed, send emails).
- **SESS-06**: Auto-notify inactive employees (24h reminder for pending requests).

### Communication (COMM)
- **COMM-01**: Create conversation (chat) for each booking.
- **COMM-02**: Real-time chat interface for students/parents and employees.

### Reviews & Analytics (REV)
- **REV-01**: Review system for mentors (rating, comments).
- **REV-02**: Transcript generation from chat messages.
- **REV-03**: AI summaries of session transcripts.

### UI/UX (UI)
- **UI-01**: Premium dark SaaS aesthetic across all pages.
- **UI-02**: Mobile responsive design for all interfaces.
- **UI-03**: Employee dashboard for managing bookings and profile.
- **UI-04**: Student/Parent dashboard for managing bookings and discovery.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Completed |
| AUTH-02 | Phase 1 | Completed |
| AUTH-03 | Phase 1 | Completed |
| PROF-01 | Phase 1 | Completed |
| PROF-02 | Phase 1 | Completed |
| PROF-03 | Phase 1 | Completed |
| BOOK-01 | Phase 2 | Completed |
| BOOK-02 | Phase 2 | Completed |
| BOOK-03 | Phase 2 | Completed |
| BOOK-04 | Phase 2 | Completed |
| PAY-01 | Phase 3 | Completed |
| PAY-02 | Phase 3 | Completed |
| PAY-03 | Phase 3 | Completed |
| SESS-01 | Phase 3 | Completed |
| SESS-02 | Phase 3 | Completed |
| SESS-03 | Phase 3 | Completed |
| SESS-04 | Phase 4 | Completed |
| SESS-05 | Phase 5 | Pending |
| SESS-06 | Phase 5 | Pending |
| COMM-01 | Phase 4 | Completed |
| COMM-02 | Phase 4 | Completed |
| REV-01 | Phase 5 | Pending |
| REV-02 | Phase 5 | Pending |
| REV-03 | Phase 5 | Pending |
| UI-01 | Phase 4 | Completed |
| UI-02 | Phase 4 | Completed |
| UI-03 | Phase 2 | Completed |
| UI-04 | Phase 2 | Completed |
