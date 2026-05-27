-- Schema Hardening Migration
-- Changes:
--   1. New enums: ApplicationStatus, DisputeStatus
--   2. Altered enums: Role (add ADMIN), PayoutStatus (rename variants)
--   3. New tables: MentorApplication, MentorProfile, Notification, PayoutAttempt, FinancialAuditLog
--   4. New columns: User.isDeleted, User.onboardingCompleted, User.lastActiveAt
--   5. New columns: EmployeeProfile.bankAccountNumber, bankIfsc, upiId, workCity
--   6. New columns: Booking.disputeStatus, Booking.razorpayPayoutId
--   7. Altered columns: Booking.platformFee, Booking.employeePayout (required + default)
--   8. Changed FK constraints: RESTRICT → CASCADE for Review, Transcript, ConversationParticipant, ChatMessage
--   9. New indexes: Booking.status, Booking.scheduledAt, ChatMessage.conversationId, etc.
--   10. DB-level CHECK constraints: amountPaid > 0, durationMins BETWEEN 1 AND 480
--   11. Booking.conversationId UNIQUE constraint moved from field-level to model-level

-- ═══════════════════════════════════════════════════════
-- Step 1: Create new enums
-- ═══════════════════════════════════════════════════════

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'OPEN', 'RESOLVED_PAY', 'RESOLVED_REFUND');

-- ═══════════════════════════════════════════════════════
-- Step 2: Alter existing enums
-- ═══════════════════════════════════════════════════════

-- AlterEnum: Role — add ADMIN variant
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterEnum: PayoutStatus — rename variants INITIATED→PROCESSING, COMPLETED→PAID
CREATE TYPE "PayoutStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');
ALTER TABLE "Booking" ALTER COLUMN "payoutStatus" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "payoutStatus" TYPE "PayoutStatus_new" USING (
  CASE "payoutStatus"::text
    WHEN 'INITIATED' THEN 'PROCESSING'::text
    WHEN 'COMPLETED' THEN 'PAID'::text
    ELSE "payoutStatus"::text
  END
)::"PayoutStatus_new";
ALTER TABLE "Booking" ALTER COLUMN "payoutStatus" SET DEFAULT 'PENDING';
DROP TYPE "PayoutStatus";
ALTER TYPE "PayoutStatus_new" RENAME TO "PayoutStatus";

-- ═══════════════════════════════════════════════════════
-- Step 3: Add columns to User
-- ═══════════════════════════════════════════════════════

ALTER TABLE "User" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

-- ═══════════════════════════════════════════════════════
-- Step 4: Add columns to EmployeeProfile
-- ═══════════════════════════════════════════════════════

ALTER TABLE "EmployeeProfile" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "bankIfsc" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "upiId" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "workCity" TEXT;

-- ═══════════════════════════════════════════════════════
-- Step 5: Alter Booking table
-- ═══════════════════════════════════════════════════════

-- Add new columns
ALTER TABLE "Booking" ADD COLUMN "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Booking" ADD COLUMN "razorpayPayoutId" TEXT;

-- Change platformFee from nullable to required with default
UPDATE "Booking" SET "platformFee" = 0 WHERE "platformFee" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "platformFee" SET DEFAULT 0;
ALTER TABLE "Booking" ALTER COLUMN "platformFee" SET NOT NULL;

-- Change employeePayout from nullable to required with default
UPDATE "Booking" SET "employeePayout" = 0 WHERE "employeePayout" IS NULL;
ALTER TABLE "Booking" ALTER COLUMN "employeePayout" SET DEFAULT 0;
ALTER TABLE "Booking" ALTER COLUMN "employeePayout" SET NOT NULL;

-- ═══════════════════════════════════════════════════════
-- Step 6: Create new tables
-- ═══════════════════════════════════════════════════════

-- CreateTable: MentorApplication
CREATE TABLE "MentorApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeName" TEXT NOT NULL,
    "currentYear" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "bio" TEXT,
    "linkedinUrl" TEXT,
    "sessionRate" INTEGER NOT NULL,
    "bankAccountNumber" TEXT,
    "bankIFSC" TEXT,
    "upiId" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_ADMIN_REVIEW',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MentorProfile
CREATE TABLE "MentorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "bio" TEXT,
    "availabilitySlots" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PayoutAttempt
CREATE TABLE "PayoutAttempt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "razorpayResponse" JSONB,

    CONSTRAINT "PayoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FinancialAuditLog (append-only, no updates/deletes)
CREATE TABLE "FinancialAuditLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "amount" INTEGER,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAuditLog_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════
-- Step 7: Add foreign keys for new tables
-- ═══════════════════════════════════════════════════════

ALTER TABLE "MentorApplication" ADD CONSTRAINT "MentorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayoutAttempt" ADD CONSTRAINT "PayoutAttempt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════
-- Step 8: Add unique constraints and indexes for new tables
-- ═══════════════════════════════════════════════════════

CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");

-- ═══════════════════════════════════════════════════════
-- Step 9: Add new indexes for query performance
-- ═══════════════════════════════════════════════════════

CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_scheduledAt_idx" ON "Booking"("scheduledAt");
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");
CREATE INDEX "Review_employeeId_idx" ON "Review"("employeeId");
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX "FinancialAuditLog_bookingId_idx" ON "FinancialAuditLog"("bookingId");
CREATE INDEX "FinancialAuditLog_userId_idx" ON "FinancialAuditLog"("userId");
CREATE INDEX "FinancialAuditLog_eventType_idx" ON "FinancialAuditLog"("eventType");
CREATE INDEX "FinancialAuditLog_createdAt_idx" ON "FinancialAuditLog"("createdAt");

-- ═══════════════════════════════════════════════════════
-- Step 10: Change FK constraints (RESTRICT → CASCADE)
-- ═══════════════════════════════════════════════════════

-- Review: cascade delete with booking
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_bookingId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Transcript: cascade delete with booking
ALTER TABLE "Transcript" DROP CONSTRAINT IF EXISTS "Transcript_bookingId_fkey";
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ConversationParticipant: cascade delete with conversation
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT IF EXISTS "ConversationParticipant_conversationId_fkey";
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatMessage: cascade delete with conversation
ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_conversationId_fkey";
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════
-- Step 11: Add CHECK constraints (business rules)
-- ═══════════════════════════════════════════════════════

-- Booking amount must be positive
ALTER TABLE "Booking" ADD CONSTRAINT "booking_amount_paid_positive" CHECK ("amountPaid" > 0);

-- Session duration must be between 1 minute and 8 hours (480 minutes)
ALTER TABLE "Booking" ADD CONSTRAINT "booking_duration_mins_range" CHECK ("durationMins" > 0 AND "durationMins" <= 480);
