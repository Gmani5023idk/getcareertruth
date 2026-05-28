import { z } from 'zod';

/** POST /api/transcripts — Create or download a transcript */
export const createTranscriptSchema = z.object({
  action: z.enum(['download']).optional(),
  bookingId: z.string().min(1, 'Booking ID is required'),
  content: z.string().optional(),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
});

/** GET /api/transcripts — Query params */
export const getTranscriptSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
});

/** POST /api/transcripts/process — Trigger AI processing */
export const processTranscriptSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
});
