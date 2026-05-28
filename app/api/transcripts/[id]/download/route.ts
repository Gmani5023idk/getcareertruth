import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * GET /api/transcripts/[id]/download
 *
 * Downloads a transcript as a PDF.
 * Authorization: student/parent who owns the booking, the employee, or ADMIN.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const transcript = await prisma.transcript.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            studentId: true,
            parentId: true,
            employeeId: true,
            scheduledAt: true,
            topic: true,
            student: { select: { email: true } },
            parent: { select: { email: true } },
            employee: {
              include: {
                employeeProfile: {
                  select: { fullName: true, company: true },
                },
              },
            },
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Authorization
    const isAdmin = hasRole(session, ['ADMIN']);
    const isOwner =
      transcript.booking.studentId === session.user.id ||
      transcript.booking.parentId === session.user.id;
    const isEmployee = transcript.booking.employeeId === session.user.id;

    if (!isAdmin && !isOwner && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const BLACK = rgb(0, 0, 0);

    let y = height - 50;

    const drawLine = (text: string, size = 12, fnt = font, color = BLACK) => {
      if (y < 60) {
        const np = pdfDoc.addPage();
        y = np.getSize().height - 50;
      }
      page.drawText(text, { x: 50, y, size, font: fnt, color });
      y -= size + 6;
    };

    drawLine('Call Transcript — GetCareerTruth', 20, bold);
    y -= 10;
    drawLine(
      `Mentor : ${transcript.booking.employee.employeeProfile?.fullName ?? 'N/A'} (${transcript.booking.employee.employeeProfile?.company ?? 'N/A'})`
    );
    drawLine(`Date   : ${new Date(transcript.booking.scheduledAt).toLocaleDateString('en-IN')}`);
    drawLine(`Topic  : ${transcript.booking.topic ?? 'N/A'}`);
    y -= 10;

    if (transcript.summary) {
      drawLine('Summary', 14, bold);
      for (const line of transcript.summary.split('\n')) drawLine(line, 11);
      y -= 10;
    }

    if (transcript.keyPoints?.length) {
      drawLine('Key Points', 14, bold);
      for (const point of transcript.keyPoints) drawLine(`• ${point}`, 11);
      y -= 10;
    }

    drawLine('Full Transcript', 14, bold);
    y -= 5;
    for (const line of transcript.content.split('\n')) drawLine(line, 10);

    const pdfBytes = await pdfDoc.save();
    const elapsed = Date.now() - startTime;
    console.log(`[transcript:download] ${id} generated in ${elapsed}ms`);

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="transcript-${id}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[transcript:download] Error:', error);
    return NextResponse.json(
      { error: 'Transcript could not be downloaded. Please try again.' },
      { status: 500 }
    );
  }
}