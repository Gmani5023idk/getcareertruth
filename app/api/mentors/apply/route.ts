import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

const applySchema = z.object({
  collegeName: z.string().min(2, "College name is too short"),
  currentYear: z.string().min(1, "Current year is required"),
  branch: z.string().min(2, "Branch is too short"),
  domain: z.string().min(2, "Domain is too short"),
  bio: z.string().optional(),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().or(z.literal('')),
  sessionRate: z.number().int().positive("Session rate must be positive"),
  bankAccountNumber: z.string().optional(),
  bankIFSC: z.string().optional(),
  upiId: z.string().optional(),
}).refine(data => {
  return (data.bankAccountNumber && data.bankIFSC) || data.upiId;
}, {
  message: "At least one payout method (Bank Account + IFSC OR UPI ID) is required",
  path: ["bankAccountNumber"], // Pointing to bankAccountNumber as a placeholder for payout section
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can apply as mentors' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = applySchema.parse(body);

    const application = await prisma.mentorApplication.create({
      data: {
        userId: session.user.id,
        collegeName: validatedData.collegeName,
        currentYear: validatedData.currentYear,
        branch: validatedData.branch,
        domain: validatedData.domain,
        bio: validatedData.bio,
        linkedinUrl: validatedData.linkedinUrl,
        sessionRate: validatedData.sessionRate,
        bankAccountNumber: validatedData.bankAccountNumber,
        bankIFSC: validatedData.bankIFSC,
        upiId: validatedData.upiId,
        status: 'PENDING_ADMIN_REVIEW',
      },
    });

    // Send confirmation email to applicant
    await sendEmail({
      to: session.user.email as string,
      subject: 'Mentor Application Received',
      text: `Your mentor application is received and pending review. We will notify you once it's processed.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #2d3748;">Application Received</h2>
          <p>Hello,</p>
          <p>Your mentor application is received and pending review.</p>
          <p>Our team will review your application and notify you within 48 hours.</p>
          <p>Best,<br/>GetCareerTruth Team</p>
        </div>
      `,
    });

    return NextResponse.json({ id: application.id, status: application.status }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
    }
    console.error('Mentor apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
