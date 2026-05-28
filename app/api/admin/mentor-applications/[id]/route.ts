import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { decrypt, maskSensitive } from '@/lib/encryption';
import { logAdminAction } from '@/lib/audit-log';
import { adminRateLimit, extractClientIp } from '@/lib/ratelimit';
import { authorizeRoute } from '@/lib/auth-utils';
import { validateCsrf } from '@/lib/csrf';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const authErr = authorizeRoute(session, ['ADMIN']);
    if (authErr) return authErr;

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

    const { id } = await params;
    const body = await req.json();
    const { action, rejectionReason } = body;

    // CSRF check for mutation
    const csrfError = validateCsrf(req);
    if (csrfError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const application = await prisma.mentorApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Decrypt bank details to check if payout details exist
      const hasPayout = application.upiEncrypted || (application.bankAccountEncrypted && application.bankIfscEncrypted);
      if (!hasPayout) {
        return NextResponse.json({ error: 'Cannot approve without payout details' }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.mentorApplication.update({
          where: { id },
          data: { status: 'APPROVED' },
        }),
        prisma.mentorProfile.create({
          data: {
            userId: application.userId,
            rating: 0,
            reviewsCount: 0,
          },
        }),
      ]);

      // Audit log
      await logAdminAction(
        session!.user.id as string,
        'APPROVE_APPLICATION',
        'MentorApplication',
        id,
        { status: 'PENDING_ADMIN_REVIEW' },
        { status: 'APPROVED' },
      );

      await sendEmail({
        to: application.user.email as string,
        subject: 'Mentor Application Approved',
        text: `Congratulations! Your profile is now live on GCT.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #2d3748;">Congratulations!</h2>
            <p>Hello,</p>
            <p>Your mentor application has been approved. Your profile is now live on GetCareerTruth.</p>
            <p>You can now set your availability and start receiving bookings.</p>
            <p>Best,<br/>GetCareerTruth Team</p>
          </div>
        `,
      });

      return NextResponse.json({ status: 'APPROVED' });
    } else if (action === 'REJECT') {
      await prisma.mentorApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
        },
      });

      // Audit log
      await logAdminAction(
        session!.user.id as string,
        'REJECT_APPLICATION',
        'MentorApplication',
        id,
        { status: 'PENDING_ADMIN_REVIEW' },
        { status: 'REJECTED', rejectionReason },
      );

      await sendEmail({
        to: application.user.email as string,
        subject: 'Mentor Application Status Update',
        text: `Your mentor application was rejected. Reason: ${rejectionReason}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #2d3748;">Application Status Update</h2>
            <p>Hello,</p>
            <p>We regret to inform you that your mentor application was not approved at this time.</p>
            <p><strong>Reason:</strong> ${rejectionReason || 'No specific reason provided.'}</p>
            <p>You may re-apply once the issues are addressed.</p>
            <p>Best,<br/>GetCareerTruth Team</p>
          </div>
        `,
      });

      return NextResponse.json({ status: 'REJECTED' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Mentor application update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
