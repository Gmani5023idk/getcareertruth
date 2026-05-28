import { z } from 'zod';

/** GET /api/employees — Query params for filtering employees */
export const listEmployeesSchema = z.object({
  industry: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  search: z.string().optional(),
});
