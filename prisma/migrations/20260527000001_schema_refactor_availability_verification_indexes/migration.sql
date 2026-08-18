-- Fix 1: Create AvailabilitySlot table (replaces raw Json availabilitySlots)
-- Fix 2: Consolidate verification fields — drop deprecated columns, add verifiedAt/verificationNotes
-- Fix 3: Add indexes on frequently queried fields
-- Fix 4: Add CHECK constraints for pricePerCall and rating

-- ═══════════════════════════════════════════════════════════
-- Step 1: Create AvailabilitySlot table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE "availability_slots" (
    "id"                 TEXT         NOT NULL,
    "employeeProfileId"  TEXT,
    "mentorProfileId"    TEXT,
    "dayOfWeek"          INTEGER      NOT NULL,
    "startTime"          TEXT         NOT NULL,
    "endTime"            TEXT         NOT NULL,
    "timezone"           TEXT         NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for availability_slots
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_employeeProfileId_fkey"
    FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_mentorProfileId_fkey"
    FOREIGN KEY ("mentorProfileId") REFERENCES "MentorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for availability_slots (Fix 3)
CREATE INDEX IF NOT EXISTS "availability_slots_employeeProfileId_idx" ON "availability_slots"("employeeProfileId");
CREATE INDEX IF NOT EXISTS "availability_slots_mentorProfileId_idx" ON "availability_slots"("mentorProfileId");
CREATE INDEX IF NOT EXISTS "availability_slots_employeeProfileId_dayOfWeek_idx" ON "availability_slots"("employeeProfileId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "availability_slots_mentorProfileId_dayOfWeek_idx" ON "availability_slots"("mentorProfileId", "dayOfWeek");

-- ═══════════════════════════════════════════════════════════
-- Step 2: Consolidate verification fields on EmployeeProfile
-- ═══════════════════════════════════════════════════════════

-- Add new columns first
ALTER TABLE "EmployeeProfile" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "EmployeeProfile" ADD COLUMN "verificationNotes" TEXT;

-- Drop deprecated verification boolean/string fields
ALTER TABLE "EmployeeProfile" DROP COLUMN "isLinkedInVerified";
ALTER TABLE "EmployeeProfile" DROP COLUMN "isCompanyEmailVerified";
ALTER TABLE "EmployeeProfile" DROP COLUMN "isIdVerified";
ALTER TABLE "EmployeeProfile" DROP COLUMN "isTeamVerified";
ALTER TABLE "EmployeeProfile" DROP COLUMN "idDocumentUrl";
ALTER TABLE "EmployeeProfile" DROP COLUMN "idDocumentType";
ALTER TABLE "EmployeeProfile" DROP COLUMN "idDocumentNumber";
ALTER TABLE "EmployeeProfile" DROP COLUMN "verificationMethod";

-- ═══════════════════════════════════════════════════════════
-- Step 3: Drop old JSON availabilitySlots column
-- ═══════════════════════════════════════════════════════════

-- Note: Data from this column is migrated to availability_slots table
-- by the migration script (scripts/migrate-schema.ts)
ALTER TABLE "EmployeeProfile" DROP COLUMN "availabilitySlots";

-- ═══════════════════════════════════════════════════════════
-- Step 4: Add indexes for query performance (Fix 3)
-- ═══════════════════════════════════════════════════════════

-- User indexes
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- EmployeeProfile indexes
CREATE INDEX IF NOT EXISTS "EmployeeProfile_verificationStatus_idx" ON "EmployeeProfile"("verificationStatus");
CREATE INDEX IF NOT EXISTS "EmployeeProfile_industry_idx" ON "EmployeeProfile"("industry");

-- Booking indexes
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "Booking_employeeId_idx" ON "Booking"("employeeId");
CREATE INDEX IF NOT EXISTS "Booking_employeeId_status_idx" ON "Booking"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");

-- Review indexes
CREATE INDEX IF NOT EXISTS "Review_employeeId_idx" ON "Review"("employeeId");

-- Conversation index
CREATE INDEX IF NOT EXISTS "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- ChatMessage index (compound for message fetching per conversation)
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- ═══════════════════════════════════════════════════════════
-- Step 5: Add CHECK constraints for data integrity (Fix 4)
-- ═══════════════════════════════════════════════════════════

-- pricePerCall must be >= 0
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "employee_profile_price_per_call_non_negative"
    CHECK ("pricePerCall" >= 0);

-- rating must be between 0.0 and 5.0
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "employee_profile_rating_range"
    CHECK ("rating" >= 0.0 AND "rating" <= 5.0);

-- MentorProfile rating must be between 0.0 and 5.0
ALTER TABLE "MentorProfile" ADD CONSTRAINT "mentor_profile_rating_range"
    CHECK ("rating" >= 0.0 AND "rating" <= 5.0);

-- Review rating must be between 1 and 5
ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range"
    CHECK ("rating" >= 1 AND "rating" <= 5);

-- ═══════════════════════════════════════════════════════════
-- Step 6: Drop old availabilitySlots from MentorProfile
-- ═══════════════════════════════════════════════════════════

-- Data migration handled by scripts/migrate-schema.ts
ALTER TABLE "MentorProfile" DROP COLUMN "availabilitySlots";
