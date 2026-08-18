-- ═══════════════════════════════════════════════════════════════
-- ROLLBACK MIGRATION: Schema Refactor (Availability, Verification, Indexes, Constraints)
-- 
-- Reverses all changes from: 20260527000001_schema_refactor_availability_verification_indexes
--
-- WARNING: This will DESTROY data in the availability_slots table!
-- Run this ONLY if you need to roll back to the previous schema.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Step 1: Drop CHECK constraints (Fix 4 reversal)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS "Review" DROP CONSTRAINT IF EXISTS "review_rating_range";
ALTER TABLE IF EXISTS "MentorProfile" DROP CONSTRAINT IF EXISTS "mentor_profile_rating_range";
ALTER TABLE IF EXISTS "EmployeeProfile" DROP CONSTRAINT IF EXISTS "employee_profile_rating_range";
ALTER TABLE IF EXISTS "EmployeeProfile" DROP CONSTRAINT IF EXISTS "employee_profile_price_per_call_non_negative";

-- ═══════════════════════════════════════════════════════════════
-- Step 2: Drop new indexes added by the migration (Fix 3 reversal)
-- ═══════════════════════════════════════════════════════════════
-- Note: Indexes that pre-existed the migration are NOT dropped here.
-- Only indexes created by the 20260527000001 migration are dropped.

-- AvailabilitySlot indexes
DROP INDEX IF EXISTS "availability_slots_employeeProfileId_dayOfWeek_idx";
DROP INDEX IF EXISTS "availability_slots_mentorProfileId_dayOfWeek_idx";
DROP INDEX IF EXISTS "availability_slots_employeeProfileId_idx";
DROP INDEX IF EXISTS "availability_slots_mentorProfileId_idx";

-- EmployeeProfile indexes
DROP INDEX IF EXISTS "EmployeeProfile_verificationStatus_idx";
DROP INDEX IF EXISTS "EmployeeProfile_industry_idx";

-- User indexes
DROP INDEX IF EXISTS "User_role_createdAt_idx";

-- Note: User_role_idx, Booking_status_idx, Booking_employeeId_idx,
-- Booking_scheduledAt_idx, Review_employeeId_idx, Conversation_updatedAt_idx,
-- ChatMessage_conversationId_createdAt_idx, Booking_employeeId_status_idx
-- may have existed in older migrations — keep them if they did.
-- The following drops are safe to run (IF EXISTS) to clean up any that were
-- created by this migration:
DROP INDEX IF EXISTS "Booking_employeeId_status_idx";

-- ═══════════════════════════════════════════════════════════════
-- Step 3: Drop new columns added to EmployeeProfile (Fix 2 reversal)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS "EmployeeProfile" DROP COLUMN IF EXISTS "verifiedAt";
ALTER TABLE IF EXISTS "EmployeeProfile" DROP COLUMN IF EXISTS "verificationNotes";

-- ═══════════════════════════════════════════════════════════════
-- Step 4: Re-add deprecated verification columns (Fix 2 reversal)
-- ═══════════════════════════════════════════════════════════════
-- All columns are nullable to match the pre-migration schema.

ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "isLinkedInVerified" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "isCompanyEmailVerified" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "isIdVerified" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "isTeamVerified" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "idDocumentUrl" TEXT;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "idDocumentType" TEXT;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "idDocumentNumber" TEXT;
ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- Step 5: Re-add the old JSON availabilitySlots column (Fix 1 reversal)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS "EmployeeProfile" ADD COLUMN IF NOT EXISTS "availabilitySlots" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS "MentorProfile" ADD COLUMN IF NOT EXISTS "availabilitySlots" JSONB DEFAULT '[]'::jsonb;

-- ═══════════════════════════════════════════════════════════════
-- Step 6: Drop the AvailabilitySlot table (Fix 1 reversal)
-- ═══════════════════════════════════════════════════════════════
-- ⚠️ WARNING: This destroys all AvailabilitySlot data irreversibly!

DROP TABLE IF EXISTS "availability_slots";

-- ═══════════════════════════════════════════════════════════════
-- Step 7: Restore pricePerCall default to 29900 (pre-migration value)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS "EmployeeProfile" ALTER COLUMN "pricePerCall" SET DEFAULT 29900;

-- ═══════════════════════════════════════════════════════════════
-- Final: Verify integrity
-- ═══════════════════════════════════════════════════════════════

-- Run after rollback to confirm:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'EmployeeProfile'
--   ORDER BY ordinal_position;
-- (Should include isLinkedInVerified, isCompanyEmailVerified, etc.
--  Should NOT include verifiedAt, verificationNotes)
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name = 'availability_slots';
-- (Should return 0 rows — table is gone)
