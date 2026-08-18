import * as Sentry from '@sentry/nextjs';

/**
 * Global process-level exception handlers.
 * Catches crashes that bypass route-level try/catch — especially
 * critical for cron jobs and background workers that never surface
 * a HTTP response to the client.
 *
 * Registered once per Node.js worker process via instrumentation.ts.
 */
function setupGlobalHandlers() {
  // ── Unhandled promise rejections ──────────────────────────────────────────
  // Any promise rejected without a .catch() handler — these silently swallow
  // errors and crash the process without warning.
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[unhandledRejection]', err);
    console.error('  at', promise); // stack trace of the rejecting call site

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(err, {
        tags: { type: 'unhandledRejection' },
        extra: { reason: String(reason) },
      });
    }

    // Don't exit — give Sentry 3s to flush before process dies
    setTimeout(() => {}, 3000);
  });

  // ── Uncaught exceptions ────────────────────────────────────────────────────
  // Synchronous errors thrown with no try/catch — fatal, process must restart
  process.on('uncaughtException', (err: Error) => {
    console.error('[uncaughtException]', err);

    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(err, {
        tags: { type: 'uncaughtException' },
      });
    }

    // Graceful shutdown: give Sentry 3s to flush, then exit
    setTimeout(() => {
      if (typeof process.exit === 'function') process.exit(1);
    }, 3000);
  });

  // ── Warning: synchronous exit if both handlers fire ─────────────────────
  // uncaughtException fires first; unhandledRejection may fire after.
  // Both handlers use setTimeout delays — whichever fires first wins.
}

// Only register global handlers in Node.js runtime (not Edge)
// Edge Runtime doesn't support process.on() or process.exit()
if (typeof process !== 'undefined' && typeof process.on === 'function') {
  setupGlobalHandlers();
}

/**
 * Next.js instrumentation — runs once per Node.js worker process.
 * Vercel auto-injects NEXT_RUNTIME = 'nodejs' for serverless functions.
 * For local dev with `next dev`, this is also loaded.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Skip double-init — handlers already registered above
  if (Sentry.getClient()) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    enabled: process.env.NODE_ENV === 'production',
    sendDefaultPii: false,
    initialScope: {
      tags: {
        region: process.env.VERCEL_REGION ?? 'unknown',
        build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      },
    },
  });

  console.log('[Sentry] Initialized — server runtime, global handlers active');
}