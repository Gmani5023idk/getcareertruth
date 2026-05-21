import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { processTranscript } from '@/lib/transcript-ai';

const prisma = new PrismaClient();

/**
 * Process transcript with AI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        transcript: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (!booking.transcript) {
      return NextResponse.json(
        { error: 'Transcript not found for this booking' },
        { status: 404 }
      );
    }

    // Process transcript with AI
    const aiResults = await processTranscript(booking.transcript.content);

    // Update transcript with AI results
    const updatedTranscript = await prisma.transcript.update({
      where: { id: booking.transcript.id },
      data: {
        summary: aiResults.summary,
        keyPoints: aiResults.keyPoints,
        actionItems: aiResults.actionItems,
        sentiment: aiResults.sentiment.overall,
        sentimentConfidence: aiResults.sentiment.confidence,
        topics: aiResults.sentiment.topics,
      },
    });

    return NextResponse.json(
      {
        message: 'Transcript processed successfully',
        transcript: updatedTranscript,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Process transcript error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process transcript' },
      { status: 500 }
    );
  }
}
