import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processTranscript } from '@/lib/transcript-ai';
import { apiHandler, success } from '@/lib/api-handler';
import { processTranscriptSchema } from '@/shared/schemas/transcript.schema';

/** POST /api/transcripts/process — Process a transcript with AI */
export const POST = apiHandler({
  requireAuth: true,
  schema: processTranscriptSchema,
  handler: async ({ body }) => {
    const { bookingId } = body;

    // Get booking with transcript
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { transcript: true },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!booking.transcript) {
      return NextResponse.json(
        { success: false, error: 'Transcript not found for this booking', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Set aiStatus to PROCESSING
    await prisma.booking.update({
      where: { id: bookingId },
      data: { aiStatus: 'PROCESSING' },
    });

    try {
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

      // Mark aiStatus as COMPLETED
      await prisma.booking.update({
        where: { id: bookingId },
        data: { aiStatus: 'COMPLETED' },
      });

      return success({
        message: 'Transcript processed successfully',
        transcript: updatedTranscript,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI processing error';
      console.error('Process transcript error:', error);

      // Mark aiStatus as FAILED
      await prisma.booking.update({
        where: { id: bookingId },
        data: { aiStatus: 'FAILED', aiError: errorMessage },
      });

      return NextResponse.json(
        { success: false, error: 'Failed to process transcript', code: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }
  },
});
