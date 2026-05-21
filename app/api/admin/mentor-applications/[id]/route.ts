import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, rejectionReason } = body;

    const application = await prisma.mentorApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      if (!application.upiId && (!application.bankAccountNumber || !application.bankIFSC)) {
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
  } catch (error: any) {
    console.error('Mentor application update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
