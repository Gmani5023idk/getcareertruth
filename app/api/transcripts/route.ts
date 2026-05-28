import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/auth-utils';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  checkRateLimit,
  transcriptRateLimit,
  extractClientIp,
} from '@/lib/ratelimit';

/**
 * Handle transcript operations
 * POST /api/transcripts - Create a transcript or download as PDF
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth check ──
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting ──
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(transcriptRateLimit, `${session.user.id}:${ip}`, 'transcript-create');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await req.json();
    const { action, bookingId, content, summary, keyPoints } = body;

    // Handle PDF download request
    if (action === 'download' || (!content && !summary && bookingId)) {
      if (!bookingId) {
        return NextResponse.json(
          { error: 'Booking ID is required' },
          { status: 400 }
        );
      }

      // Get transcript
      const transcript = await prisma.transcript.findUnique({
        where: { bookingId },
        include: {
          booking: {
            include: {
              student: true,
              parent: true,
              employee: {
                include: {
                  employeeProfile: true,
                },
              },
            },
          },
        },
      });

      if (!transcript) {
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        );
      }

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = height - 50;

      // Title
      page.drawText('Call Transcript', {
        x: 50,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= 40;

      // Date
      page.drawText(`Date: ${new Date(transcript.booking.scheduledAt).toLocaleDateString()}`, {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      // Time
      page.drawText(`Time: ${new Date(transcript.booking.scheduledAt).toLocaleTimeString()}`, {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      // Employee
      page.drawText(`Employee: ${transcript.booking.employee.employeeProfile?.fullName || 'Mentor'}`, {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      // Company
      page.drawText(`Company: ${transcript.booking.employee.employeeProfile?.company || 'N/A'}`, {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 40;

      // Summary
      if (transcript.summary) {
        page.drawText('Summary:', {
          x: 50,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        y -= 20;

        const summaryLines = transcript.summary.split('\n');
        for (const line of summaryLines) {
          page.drawText(line, {
            x: 50,
            y,
            size: 11,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 15;
        }
        y -= 20;
      }

      // Key Points
      if (transcript.keyPoints && transcript.keyPoints.length > 0) {
        page.drawText('Key Points:', {
          x: 50,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        y -= 20;

        for (const point of transcript.keyPoints) {
          page.drawText(`• ${point}`, {
            x: 50,
            y,
            size: 11,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 15;
        }
        y -= 20;
      }

      // Content
      page.drawText('Full Transcript:', {
        x: 50,
        y,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      const contentLines = transcript.content.split('\n');
      for (const line of contentLines) {
        if (y < 50) {
          const newPage = pdfDoc.addPage();
          y = newPage.getSize().height - 50;
        }
        page.drawText(line, {
          x: 50,
          y,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
        y -= 12;
      }

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Return PDF as base64
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

      return NextResponse.json(
        {
          message: 'PDF generated successfully',
          pdf: pdfBase64,
          filename: `transcript-${bookingId}.pdf`,
        },
        { status: 200 }
      );
    }

    // Default: Create a new transcript
    if (!bookingId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        parent: true,
        employee: {
          include: {
            employeeProfile: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // ── Authorization: verify user is associated with this booking ──
    const isAdmin = hasRole(session, ['ADMIN']);
    const isOwner =
      booking.studentId === session.user.id ||
      booking.parentId === session.user.id;
    const isEmployee = booking.employeeId === session.user.id;
    if (!isAdmin && !isOwner && !isEmployee) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create transcript
    const transcript = await prisma.transcript.create({
      data: {
        bookingId,
        employeeId: booking.employee.employeeProfile?.id!,
        content,
        summary,
        keyPoints,
      },
    });

    return NextResponse.json(
      {
        message: 'Transcript created successfully',
        transcript,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Transcript error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * Get transcript(s)
 * GET /api/transcripts?bookingId=xxx - Get single transcript by bookingId
 * GET /api/transcripts?page=1&limit=10 - List transcripts with pagination
 */
export async function GET(req: NextRequest) {
  try {
    // ── Auth check ──
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting ──
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(transcriptRateLimit, `${session.user.id}:${ip}`, 'transcript-get');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);

    const isAdmin = hasRole(session, ['ADMIN']);
    const userId = session.user.id;

    // Build user-scoped where clause
    const userWhere = isAdmin
      ? {}
      : {
          booking: {
            OR: [
              { employeeId: userId },
              { studentId: userId },
              { parentId: userId },
            ],
          },
        };

    // Single transcript by bookingId
    if (bookingId) {
      const transcript = await prisma.transcript.findFirst({
        where: {
          bookingId,
          ...userWhere,
        },
        include: {
          booking: {
            include: {
              student: { select: { id: true, email: true } },
              parent: { select: { id: true, email: true } },
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
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { transcript },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // List transcripts with pagination (user-scoped)
    const skip = (page - 1) * limit;
    const [transcripts, total] = await Promise.all([
      prisma.transcript.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              student: { select: { id: true, email: true } },
              parent: { select: { id: true, email: true } },
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
      }),
      prisma.transcript.count({ where: userWhere }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        transcripts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Get transcript error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to get transcript' },
      { status: 500 }
    );
  }
}
