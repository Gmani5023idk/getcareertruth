import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { auditLog, AuditAction, logAdminAction } from '@/lib/audit-log';
import { adminRateLimit, extractClientIp } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Defence-in-depth: admin rate limiting
    const clientIp = extractClientIp(req);
    try {
      const result = await adminRateLimit.limit(`admin:handler:${clientIp}`);
      if (!result.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch (rateLimitError) {
      console.error('Admin rate limit error (allowing):', rateLimitError);
    }

    // CSRF check
    const { validateCsrf } = await import('@/lib/csrf');
    const csrfError = validateCsrf(req);
    if (csrfError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { bookingId, outcome } = body; // outcome: 'RESOLVED_PAY' | 'RESOLVED_REFUND'

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        employee: true,
        student: true,
        parent: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (outcome === 'RESOLVED_PAY') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { disputeStatus: 'RESOLVED_PAY' },
      });

      // Admin can now trigger payout manually from the panel
      return NextResponse.json({ status: 'RESOLVED_PAY' });
    } else if (outcome === 'RESOLVED_REFUND') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { 
          disputeStatus: 'RESOLVED_REFUND',
          status: 'REFUNDED',
          payoutStatus: 'FAILED', 
        },
      });

      // Email student
      const studentEmail = booking.student?.email || booking.parent?.email;
      if (studentEmail) {
        await sendEmail({
          to: studentEmail,
          subject: 'Refund Processed for Disputed Session',
          text: `A full refund of ₹${booking.amountPaid} has been initiated for your session.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2 style="color: #2d3748;">Refund Initiated</h2>
              <p>Hello,</p>
              <p>Following the resolution of the dispute for session <strong>${bookingId}</strong>, we have initiated a full refund of <strong>₹${booking.amountPaid}</strong>.</p>
              <p>The amount should reflect in your account within 5-7 business days.</p>
              <p>Best,<br/>GetCareerTruth Team</p>
            </div>
          `,
        });
      }

      // Email senior
      await sendEmail({
        to: booking.employee.email as string,
        subject: 'Dispute Resolution Update',
        text: `The dispute for session ${bookingId} has been resolved with a refund to the student. No payout will be processed.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #2d3748;">Dispute Resolution</h2>
            <p>Hello,</p>
            <p>The dispute for session <strong>${bookingId}</strong> has been resolved with a refund to the student. Consequently, no payout will be processed for this session.</p>
            <p>Best,<br/>GetCareerTruth Team</p>
          </div>
        `,
      });

      return NextResponse.json({ status: 'RESOLVED_REFUND' });
    }

    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
  } catch (error: any) {
    console.error('Dispute resolution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
