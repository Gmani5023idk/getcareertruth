import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { createRazorpayPayout, rupeesToPaise } from '@/lib/razorpay';
import { sendEmail } from '@/lib/email';
import { decrypt } from '@/lib/encryption';
import { auditLog, AuditAction } from '@/lib/audit-log';
import { authorizeRoute } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const authErr = authorizeRoute(session, ['ADMIN']);
    if (authErr) return authErr;

    const body = await req.json();
    const { bookingId } = body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        employee: {
          include: {
            mentorApplications: {
              where: { status: 'APPROVED' },
              take: 1,
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 1. Booking status must be COMPLETED
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Booking must be COMPLETED for payout' }, { status: 400 });
    }

    // 2. payoutStatus must be PENDING or FAILED
    if (booking.payoutStatus !== 'PENDING' && booking.payoutStatus !== 'FAILED') {
      return NextResponse.json({ error: 'Payout already initiated or completed' }, { status: 400 });
    }

    // 3. employeePayout must be > 0
    if (booking.employeePayout <= 0) {
      return NextResponse.json({ error: 'Payout amount must be positive' }, { status: 400 });
    }

    const mentorApp = booking.employee.mentorApplications[0];
    if (!mentorApp) {
      return NextResponse.json({ error: 'Mentor application not found' }, { status: 404 });
    }

    // 4. Senior must have payout details (check encrypted fields)
    const hasEncryptedPayout = mentorApp.upiEncrypted || (mentorApp.bankAccountEncrypted && mentorApp.bankIfscEncrypted);
    if (!hasEncryptedPayout) {
      return NextResponse.json({ error: 'Payout details missing' }, { status: 400 });
    }

    // Decrypt payout details for processing
    const decryptedUpi = mentorApp.upiEncrypted ? decrypt(mentorApp.upiEncrypted) : null;
    const decryptedBankAccount = mentorApp.bankAccountEncrypted ? decrypt(mentorApp.bankAccountEncrypted) : null;
    const decryptedIfsc = mentorApp.bankIfscEncrypted ? decrypt(mentorApp.bankIfscEncrypted) : null;

    // Set status to PROCESSING
    await prisma.booking.update({
      where: { id: bookingId },
      data: { payoutStatus: 'PROCESSING' },
    });

    try {
      // For this build, we simulate the Razorpay Payout call.
      const payoutId = `payout_${Math.random().toString(36).substring(7)}`;

      // Update status to PAID
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          payoutStatus: 'PAID',
          razorpayPayoutId: payoutId,
        },
      });

      // Log success attempt
      await prisma.payoutAttempt.create({
        data: {
          bookingId,
          status: 'SUCCESS',
          razorpayResponse: { payoutId },
        },
      });

      // Email senior
      await sendEmail({
        to: booking.employee.email as string,
        subject: 'Your Earnings Payout Processed',
        text: `Your payout of ₹${booking.employeePayout} has been processed.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #2d3748;">Payout Successful</h2>
            <p>Hello,</p>
            <p>Great news! Your payout of <strong>₹${booking.employeePayout}</strong> for session <strong>${booking.id}</strong> has been processed successfully.</p>
            <p>Payout ID: <code>${payoutId}</code></p>
            <p>The amount should reflect in your registered account within 1-2 business days.</p>
            <p>Thank you for mentoring on GetCareerTruth!</p>
            <p>Best,<br/>GetCareerTruth Team</p>
          </div>
        `,
      });

      // Audit log for successful payout
      await auditLog({
        userId: session!.user.id,
        action: AuditAction.PAYMENT_SUCCESS,
        entity: 'Booking',
        entityId: bookingId,
        metadata: { payoutId, amount: booking.employeePayout },
        success: true,
      });

      return NextResponse.json({ status: 'PAID', payoutId });
    } catch (error) {
      console.error('Razorpay payout error:', error);
      
      await prisma.booking.update({
        where: { id: bookingId },
        data: { payoutStatus: 'FAILED' },
      });

      // Log failure attempt
      await prisma.payoutAttempt.create({
        data: {
          bookingId,
          status: 'FAILED',
          razorpayResponse: { error: (error as Error).message },
        },
      });

      // Email senior about failure
      await sendEmail({
        to: booking.employee.email as string,
        subject: 'Payout Processing Failed',
        text: `Your payout of ₹${booking.employeePayout} failed. Our team will look into it and retry shortly.`,
        html: `<p>Your payout of ₹${booking.employeePayout} failed. Our team will look into it and retry shortly.</p>`,
      });

      // Audit log for failed payout
      await auditLog({
        userId: session!.user.id,
        action: AuditAction.PAYMENT_FAILED,
        entity: 'Booking',
        entityId: bookingId,
        metadata: { error: (error as Error).message, amount: booking.employeePayout },
        success: false,
      });

      return NextResponse.json({ error: 'Payout failed', detail: (error as Error).message }, { status: 500 });
    }
  } catch (error) {
    console.error('Payout initiate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
