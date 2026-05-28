import * as Sentry from '@sentry/nextjs';

/**
 * Sentry server-side initialization.
 * Only activates in production — dev errors go straight to console.
 *
 * To use in a route handler catch block:
 *   import { captureError } from '@/lib/sentry-server';
 *   const userMsg = captureError(err, 'GET /api/some-route');
 */
export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,         // 5% of transactions — keep cost low
    replaysOnErrorSampleRate: 1.0,   // Always capture session replay on crash
    enabled: process.env.NODE_ENV === 'production',
    sendDefaultPii: false,           // Never send PII (emails, names) unless needed
    // Tag every event with deployment context
    initialScope: {
      tags: {
        region: process.env.VERCEL_REGION ?? 'unknown',
      },
    },
  });
}

/**
 * Capture an exception in Sentry, log it server-side, return a safe user message.
 * Use in all catch blocks so nothing leaks to the client.
 *
 * @param error     - The caught error
 * @param context   - Short description for the ops team (e.g. 'POST /api/bookings')
 */
export function captureError(error: unknown, context: string): string {
  // Full log for ops
  console.error(`[${context}]`, error);

  // Sentry capture (silent — no re-throw)
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: { context } });
  }

  return 'Something went wrong. Please try again or contact support.';
}