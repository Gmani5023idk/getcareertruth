# 🚀 Production Deployment Checklist — GetCareerTruth

> Run through this checklist **before** and **after** each production deployment.
> Check off each item only after verification.

---

## Phase 1: Pre-Deploy — Environment Variables

Verify every required variable is set in the Vercel (or hosting) dashboard.

### 🔐 Authentication & Security

| Variable | Required | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` — must be stable across deploys |
| `NEXTAUTH_URL` | ✅ | Production URL (e.g. `https://getcareertruth.in`) |
| `ADMIN_SECRET` | ✅ | Shared secret for Vercel Cron + admin-server calls |
| `ADMIN_ALLOWED_IPS` | ❓ Optional | Comma-separated IPs for admin route IP allowlisting |

### 💳 Payments (Razorpay)

| Variable | Required | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | ✅ | Live key (not test) |
| `RAZORPAY_KEY_SECRET` | ✅ | Live secret — **never** expose client-side |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Must match the secret configured in Razorpay dashboard |

### 💬 Real-time (Pusher)

| Variable | Required | Notes |
|---|---|---|
| `PUSHER_APP_ID` | ✅ | Production app ID |
| `NEXT_PUBLIC_PUSHER_KEY` | ✅ | Public key — safe to expose |
| `PUSHER_SECRET` | ✅ | Server secret — **never** expose client-side |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | ✅ | Cluster for production region (e.g. `ap2`) |

### 📊 Monitoring (Sentry)

| Variable | Required | Notes |
|---|---|---|
| `SENTRY_DSN` | ✅ | Production DSN from Sentry project settings |

### 🗄️ Database

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Production PostgreSQL connection string |
| `DIRECT_URL` | ✅ (if pooling) | Direct connection for Prisma Migrate when using PgBouncer |

### 🚀 Platform

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical production URL (e.g. `https://getcareertruth.in`) |

---

## Phase 2: Post-Deploy — Smoke Tests

Run these **after** deployment completes. Use `curl` or a browser.

### 2.1 Public Pages

```bash
# Homepage loads (200)
curl -s -o /dev/null -w "%{http_code}" https://getcareertruth.in/
# Expected: 200

# Sitemap loads
curl -s -o /dev/null -w "%{http_code}" https://getcareertruth.in/sitemap.xml
# Expected: 200

# Robots.txt loads
curl -s -o /dev/null -w "%{http_code}" https://getcareertruth.in/robots.txt
# Expected: 200
```

### 2.2 Auth Endpoints

```bash
# Login page loads
curl -s -o /dev/null -w "%{http_code}" https://getcareertruth.in/login
# Expected: 200

# API login rejects invalid body shape (not 500)
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":""}' \
  https://getcareertruth.in/api/auth/login
# Expected: 400 (Zod validation) — not 500
```

### 2.3 Public API Endpoints

```bash
# Employees list (paginated)
curl -s https://getcareertruth.in/api/employees?page=1&limit=10 | head -c 200
# Expected: 200 + JSON with `data` and `pagination` keys
```

### 2.4 Admin Route Protection (Edge + Handler)

```bash
# Unauthenticated → 401 at edge
curl -s -o /dev/null -w "%{http_code}" https://getcareertruth.in/api/admin/users
# Expected: 401

# Simulate non-admin token → 403 (requires JWT — best tested in browser incognito)
# Login as STUDENT user, navigate to /admin in browser
# Expected: Redirected to / or 403
```

### 2.5 Payment Endpoints

```bash
# Unauthenticated refund → 401
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"test"}' \
  https://getcareertruth.in/api/payments/refund
# Expected: 401

# Webhook without signature → 401 (handler rejects)
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://getcareertruth.in/api/payments/webhook
# Expected: 401 (signature verification fails)
```

### 2.6 Transcript Endpoints

```bash
# Unauthenticated → 401
curl -s -o /dev/null -w "%{http_code}" https://getcareertruth.in/api/transcripts
# Expected: 401

# Unauthenticated POST → 401
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"test"}' \
  https://getcareertruth.in/api/transcripts
# Expected: 401
```

### 2.7 CSRF Protection

```bash
# POST to refund with foreign Origin → 403 at edge
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -H "Cookie: <valid-session-cookie>" \
  -d '{"bookingId":"test"}' \
  https://getcareertruth.in/api/payments/refund
# Expected: 403 (CSRF blocked at edge)

# Same request without Origin → should pass edge CSRF, get rejected by handler
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"test"}' \
  https://getcareertruth.in/api/payments/refund
# Expected: 401 (handler auth check, not CSRF)
```

---

## Phase 3: Service Verifications

### 3.1 Sentry

1. Go to **[Sentry Dashboard → Issues](https://sentry.io)** for the production project
2. Confirm the environment filter shows `production`
3. Trigger a deliberate 500 error (e.g. hit `/api/payments/refund` with invalid JSON body)
4. Verify the error appears in Sentry within 60 seconds
5. **Check:** Source maps are uploaded (stack traces show original TS lines, not minified)

### 3.2 Pusher

1. Open the browser DevTools console on the production site
2. Log in as a student/employee
3. Check for Pusher connection message in WebSocket tab:
   ```
   Pusher: State changed -> connecting -> connected (cluster: ap2)
   ```
4. Verify private channel authentication works by sending a chat message
5. **Check:** The `NEXT_PUBLIC_PUSHER_CLUSTER` in env matches the cluster used by the Pusher app

### 3.3 Razorpay Webhook

1. Go to **[Razorpay Dashboard → Settings → Webhooks](https://dashboard.razorpay.com/)**
2. Verify the **Webhook URL** points to the production domain:
   ```
   https://getcareertruth.in/api/payments/webhook
   ```
3. Verify the **Webhook Secret** matches `RAZORPAY_WEBHOOK_SECRET` env var
4. Confirm at minimum **`payment.captured`** event is enabled
5. **Check:** Razorpay shows a green "Last delivered" timestamp (recent success)
6. **Security:** Verify the webhook endpoint rejects unauthenticated pings:
   ```bash
   # Send a test webhook without valid signature
   curl -s -o /dev/null -w "%{http_code}" -X POST \
     -H "Content-Type: application/json" \
     -d '{"event":"payment.captured","payload":{}}' \
     https://getcareertruth.in/api/payments/webhook
   # Expected: 401
   ```

### 3.4 Vercel Cron Jobs

1. Go to **[Vercel Dashboard → Cron Jobs](https://vercel.com/docs/cron-jobs)** for the project
2. Verify these cron jobs are configured:

| Job | Endpoint | Schedule | Method |
|---|---|---|---|
| Process sessions | `/api/cron/process-sessions` | Every 5 min | POST |
| Cleanup audit logs | `/api/cron/cleanup-audit-logs` | Weekly (Sun 00:00 UTC) | GET |

3. Verify each job's **`x-admin-secret`** header matches `ADMIN_SECRET` env var
4. **Check:** Vercel shows "Last Run: Succeeded" with recent timestamps

### 3.5 Database Migrations

```bash
# Verify the production schema matches the migration state
npx prisma migrate status
# Expected: "Database schema is up to date"
```

---

## Phase 4: Final Checks

- [ ] All 12 test files pass (181 tests) — run `npx vitest run`
- [ ] Build succeeds — run `npm run build`
- [ ] No console errors on homepage (check DevTools Console)
- [ ] No mixed-content warnings (all scripts/assets served over HTTPS)
- [ ] Lighthouse score ≥ 90 for performance, accessibility, and security
- [ ] PWA service worker registered (`navigator.serviceWorker` in console)
- [ ] POST to `/api/payments/webhook` without signature **returns 401**
- [ ] POST to `/api/payments/refund` with foreign `Origin` header **returns 403** (CSRF)
- [ ] GET `/api/transcripts` without auth **returns 401**

---

## Phase 5: Rollback Plan

If any critical check fails:

```bash
# 1. Revert to previous stable deployment in Vercel dashboard
# 2. Or rollback via CLI:
vercel rollback --confirm

# 3. Fix the issue in a new branch
# 4. Re-deploy after fix + re-run this checklist
```

**Never skip Phase 3 (Service Verifications)** — Sentry, Pusher, and Razorpay webhooks
must be confirmed working manually. Automated tests cannot catch configuration drift
in third-party dashboards.
