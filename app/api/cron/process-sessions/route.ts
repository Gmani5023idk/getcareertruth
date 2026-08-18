import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processTranscript } from '@/lib/transcript-ai';
import { sendEmail } from '@/lib/email';
import { captureError } from '@/lib/sentry-server';

const CRON_NAME = 'process-sessions';

/**
 * Admin Cron: Process Sessions
 * Marks past sessions as completed, generates transcripts, and sends notifications.
 *
 * Cron schedule: Every 5 minutes via Vercel Cron
 * Auth: x-admin-secret header
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log(`[CRON:${CRON_NAME}] Starting — ${new Date().toISOString()}`);

  // ── Auth check ──
  const authHeader = req.headers.get('x-admin-secret');
  if (authHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Mark Confirmed sessions as COMPLETED if they ended
    const sessionsToComplete = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        scheduledAt: {
          lt: new Date(now.getTime() - 30 * 60000),
        },
      },
      include: {
        student: true,
        parent: true,
        employee: { include: { employeeProfile: true } },
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' }, include: { sender: true } } },
        },
      },
    });

    const results = [];

    for (const booking of sessionsToComplete) {
      try {
        const messages = booking.conversation?.messages || [];
        const transcriptContent =
          messages.length > 0
            ? messages.map((m) => `[${m.createdAt.toLocaleTimeString()}] ${m.sender.role}: ${m.content}`).join('\n')
            : 'No chat messages exchanged during this session.';

        const transcript = await prisma.transcript.upsert({
          where: { bookingId: booking.id },
          update: { content: transcriptContent },
          create: {
            bookingId: booking.id,
            employeeId: booking.employee.employeeProfile?.id!,
            content: transcriptContent,
          },
        });

        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'COMPLETED', completedAt: now, aiStatus: 'PROCESSING' },
        });

        // Trigger AI processing
        try {
          const aiResults = await processTranscript(transcriptContent);
          await prisma.transcript.update({
            where: { id: transcript.id },
            data: {
              summary: aiResults.summary,
              keyPoints: aiResults.keyPoints,
              actionItems: aiResults.actionItems,
              sentiment: aiResults.sentiment.overall,
              sentimentConfidence: aiResults.sentiment.confidence,
              topics: aiResults.sentiment.topics,
            },
          });
          await prisma.booking.update({ where: { id: booking.id }, data: { aiStatus: 'COMPLETED' } });
        } catch (aiErr) {
          const aiErrorMessage = aiErr instanceof Error ? aiErr.message : String(aiErr);
          console.error(`[CRON:${CRON_NAME}] AI processing failed booking ${booking.id}:`, aiErr);
          await prisma.booking.update({
            where: { id: booking.id },
            data: { aiStatus: 'FAILED', aiError: aiErrorMessage },
          });
          // Non-fatal: continue processing other sessions
        }

        // Send session-complete email
        const recipientEmail = booking.student?.email || booking.parent?.email;
        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: 'Session Summary Available',
            html: `<p>Your session with ${booking.employee.employeeProfile?.fullName || 'your mentor'} is complete. View your transcript and summary in your dashboard.</p>`,
            text: `Your session with ${booking.employee.employeeProfile?.fullName || 'your mentor'} is complete. View your transcript in your dashboard.`,
          }).catch((emailErr) => {
            console.error(`[CRON:${CRON_NAME}] Email failed for booking ${booking.id}:`, emailErr);
          });
        }

        results.push({ id: booking.id, status: 'PROCESSED' });
      } catch (sessionErr) {
        console.error(`[CRON:${CRON_NAME}] Failed to process booking ${booking.id}:`, sessionErr);
        results.push({ id: booking.id, status: 'FAILED', error: String(sessionErr) });
        // Non-fatal: continue with other bookings
      }
    }

    // 2. Send 24h inactivity reminders to employees
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pendingRequests = await prisma.booking.findMany({
      where: {
        status: 'PENDING_CONFIRM',
        createdAt: { lt: yesterday },
        reminderSentAt: null,
      },
      include: {
        employee: true,
        student: { include: { studentProfile: true } },
        parent: { include: { parentProfile: true } },
      },
    });

    for (const reqItem of pendingRequests) {
      try {
        const studentName = reqItem.student?.studentProfile?.fullName || reqItem.parent?.parentProfile?.fullName || 'A student';
        await sendEmail({
          to: reqItem.employee.email as string,
          subject: 'Reminder: Pending Booking Request',
          html: `<p>Hello, you have a pending booking request from <strong>${studentName}</strong> since yesterday. Please approve or reject it in your dashboard.</p>`,
          text: `Reminder: You have a pending booking request from ${studentName} since yesterday.`,
        }).catch((emailErr) => {
          console.error(`[CRON:${CRON_NAME}] Reminder email failed for booking ${reqItem.id}:`, emailErr);
        });

        await prisma.booking.update({
          where: { id: reqItem.id },
          data: { reminderSentAt: now },
        });
      } catch (reminderErr) {
        console.error(`[CRON:${CRON_NAME}] Reminder failed for booking ${reqItem.id}:`, reminderErr);
      }
    }

    // 3. Process payout retries
    const retryResults = await processPayoutRetries(CRON_NAME);

    const elapsed = Date.now() - startTime;
    console.log(`[CRON:${CRON_NAME}] Completed in ${elapsed}ms — sessions=${sessionsToComplete.length} reminders=${pendingRequests.length} payouts=${retryResults.length}`);

    return NextResponse.json({
      success: true,
      processedSessions: sessionsToComplete.length,
      remindersSent: pendingRequests.length,
      payoutRetries: retryResults.length,
      durationMs: elapsed,
      details: results,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const userMessage = captureError(error, `CRON:${CRON_NAME}`);
    console.error(`[CRON:${CRON_NAME}] FAILED after ${elapsed}ms:`, error);
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}

async function processPayoutRetries(cronName: string) {
  const now = new Date();
  const failedBookings = await prisma.booking.findMany({
    where: {
      payoutStatus: 'FAILED',
      disputeStatus: 'NONE',
      employeePayout: { gt: 0 },
    },
    include: { payoutAttempts: { orderBy: { attemptedAt: 'desc' } } },
  });

  const processed = [];
  for (const booking of failedBookings) {
    const attempts = booking.payoutAttempts;
    if (attempts.length === 0 || attempts.length >= 3) continue;

    const lastAttempt = attempts[0];
    const timeSinceLast = now.getTime() - lastAttempt.attemptedAt.getTime();
    const backoffMs = [5, 30, 120][attempts.length - 1] * 60_000;

    if (timeSinceLast >= backoffMs) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/payouts/initiate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': process.env.ADMIN_SECRET!,
          },
          body: JSON.stringify({ bookingId: booking.id }),
        });
        processed.push({ id: booking.id, attempt: attempts.length + 1 });
      } catch (err) {
        console.error(`[CRON:${cronName}] Auto-retry failed for ${booking.id}:`, err);
      }
    }
  }
  return processed;
}
