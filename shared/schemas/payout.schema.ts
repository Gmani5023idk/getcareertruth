import { z } from 'zod';

/** POST /api/payments/payouts — Request a payout */
export const requestPayoutSchema = z.object({
  employeeId: z.string().uuid('Employee ID must be a valid UUID'),
});

/** GET /api/payments/payouts — Query params for payout list */
export const getPayoutsSchema = z.object({
  employeeId: z.string().uuid('Employee ID must be a valid UUID'),
});
