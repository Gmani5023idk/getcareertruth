-- Migration: Add meetingStatus and aiStatus tracking
-- ============================================================
--
-- New enums:
--   MeetingStatus — tracks lifecycle of Zoom meeting creation
--   AiStatus      — tracks lifecycle of AI transcript processing
--
-- New columns on Booking:
--   meetingStatus  — tracks the status of the Zoom meeting for this booking
--   meetingError   — stores the error message if meeting creation failed
--   aiStatus       — tracks the status of AI transcript processing
--   aiError        — stores the error message if AI processing failed
--
-- New index:
--   Booking_aiStatus_idx — for filtering bookings by AI processing status

-- ═══════════════════════════════════════════════════════════
-- Step 1: Create new enums
-- ═══════════════════════════════════════════════════════════

-- CreateEnum: MeetingStatus
--   CREATING         → Zoom meeting creation is in progress
--   ACTIVE           → Meeting was created successfully; join_url is set
--   FAILED           → Meeting creation failed; check meetingError for details
--   NOT_APPLICABLE   → This booking does not require a meeting
CREATE TYPE "MeetingStatus" AS ENUM ('CREATING', 'ACTIVE', 'FAILED', 'NOT_APPLICABLE');

-- CreateEnum: AiStatus
--   PENDING          → AI processing hasn't started yet
--   PROCESSING       → AI is currently processing the transcript
--   COMPLETED        → AI processing finished successfully
--   FAILED           → AI processing failed; check aiError for details
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ═══════════════════════════════════════════════════════════
-- Step 2: Add columns to Booking
-- ═══════════════════════════════════════════════════════════

-- meetingStatus: starts as CREATING because the webhook flow creates the
-- meeting right after payment confirmation. Default ensures existing rows
-- that already have meetingLink set to a non-null value are treated as ACTIVE
-- (or backfilled by the application layer).
ALTER TABLE "Booking"
  ADD COLUMN "meetingStatus" "MeetingStatus" NOT NULL DEFAULT 'CREATING';

-- meetingError: nullable TEXT column to capture failure details when
-- the Zoom API call fails (network timeout, rate limit, invalid token, etc.)
ALTER TABLE "Booking"
  ADD COLUMN "meetingError" TEXT;

-- aiStatus: tracks AI transcript processing lifecycle.
-- Default 'PENDING' means no AI processing has been attempted yet.
ALTER TABLE "Booking"
  ADD COLUMN "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING';

-- aiError: nullable TEXT column to capture failure details when
-- OpenAI API calls fail during transcript processing.
ALTER TABLE "Booking"
  ADD COLUMN "aiError" TEXT;

-- ═══════════════════════════════════════════════════════════
-- Step 3: Add index for aiStatus queries
-- ═══════════════════════════════════════════════════════════

-- This index supports the cron job that finds bookings needing AI processing:
--   WHERE "aiStatus" = 'PENDING'
-- It also supports admin dashboards showing failed processing counts:
--   WHERE "aiStatus" = 'FAILED'
CREATE INDEX IF NOT EXISTS "Booking_aiStatus_idx" ON "Booking"("aiStatus");

-- ═══════════════════════════════════════════════════════════
-- Step 4: Backfill meetingStatus for existing Confirmed bookings
-- ═══════════════════════════════════════════════════════════

-- For existing Confirmed/Completed bookings that have a meetingLink,
-- the meeting was already created successfully → mark as ACTIVE.
UPDATE "Booking"
SET "meetingStatus" = 'ACTIVE'
WHERE "status" IN ('CONFIRMED', 'COMPLETED')
  AND "meetingLink" IS NOT NULL;

-- For existing Cancelled/Refunded/Expired bookings, meeting creation
-- was never needed (or was cancelled) → mark as NOT_APPLICABLE.
UPDATE "Booking"
SET "meetingStatus" = 'NOT_APPLICABLE'
WHERE "status" IN ('CANCELLED', 'REFUNDED', 'EXPIRED');

-- For existing bookings that are Confirmed/Completed but have no meetingLink,
-- this indicates a silent Zoom failure from the old code path.
-- Mark them as FAILED with a descriptive error so they're visible to admins.
UPDATE "Booking"
SET "meetingStatus" = 'FAILED',
    "meetingError" = 'Migrated: meeting was not created (silent failure from legacy code path)'
WHERE "status" IN ('CONFIRMED', 'COMPLETED')
  AND "meetingLink" IS NULL;
