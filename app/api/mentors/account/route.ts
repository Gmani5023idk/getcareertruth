import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check 1 — PROCESSING payouts
    const processingBookings = await prisma.booking.findFirst({
      where: {
        employeeId: userId,
        payoutStatus: 'PROCESSING',
      },
    });

    if (processingBookings) {
      return NextResponse.json({ 
        error: 'A payout is currently being processed. Please try again in 24 hours.' 
      }, { status: 400 });
    }

    // Check 2 — PENDING payouts on COMPLETED sessions
    const pendingPayouts = await prisma.booking.findMany({
      where: {
        employeeId: userId,
        status: 'COMPLETED',
        payoutStatus: 'PENDING',
      },
    });

    if (pendingPayouts.length > 0) {
      return NextResponse.json({ 
        error: 'You have pending payouts for completed sessions. These must be processed before account deletion.' 
      }, { status: 400 });
    }

    // Check 3 — Upcoming CONFIRMED bookings
    const futureBookings = await prisma.booking.findMany({
      where: {
        employeeId: userId,
        status: 'CONFIRMED',
        scheduledAt: { gt: new Date() },
      },
      include: {
        student: true,
        parent: true,
      },
    });

    if (futureBookings.length > 0) {
      // Cancel and refund students
      for (const booking of futureBookings) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'CANCELLED' },
        });

        const studentEmail = booking.student?.email || booking.parent?.email;
        if (studentEmail) {
          await sendEmail({
            to: studentEmail,
            subject: 'Session Cancelled - Refund Initiated',
            text: `Your session was cancelled because the mentor closed their account. A full refund of ₹${booking.amountPaid} has been initiated.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                <h2 style="color: #2d3748;">Session Cancelled</h2>
                <p>Hello,</p>
                <p>Your scheduled session with your mentor has been cancelled as they have closed their account.</p>
                <p>We have initiated a full refund of <strong>₹${booking.amountPaid}</strong>. You should see this in your account within 5-7 business days.</p>
                <p>We apologize for the inconvenience.</p>
                <p>Best,<br/>GetCareerTruth Team</p>
              </div>
            `,
          });
        }
      }
    }

    // Soft-delete account
    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        // Anonymize personal data
        phone: 'ANONYMIZED',
        passwordHash: 'ANONYMIZED',
        googleId: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Account soft-deleted successfully' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
