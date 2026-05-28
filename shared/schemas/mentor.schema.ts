import { z } from 'zod';

/** GET /api/mentors — Query params for filtering mentors */
export const listMentorsSchema = z.object({
  domain: z.string().optional(),
  sort: z.enum(['rating']).optional(),
});
