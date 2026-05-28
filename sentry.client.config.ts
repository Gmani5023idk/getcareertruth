import * as Sentry from '@sentry/nextjs';

/**
 * Sentry client-side (browser) initialization.
 * Loaded automatically by Next.js — no manual import needed.
 *
 * The ErrorBoundary component from @sentry/nextjs wraps the app root
 * in app/layout.tsx to capture React rendering errors.
 *
 * NEXT_PUBLIC_SENTRY_DSN is exposed to the browser — safe because it
 * only allows event ingestion, not data extraction.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only activate in production — skip noisy dev noise
  enabled: process.env.NODE_ENV === 'production',

  environment: process.env.NODE_ENV,

  // Sample rate for traces — 5% is cheap for overview monitoring
  tracesSampleRate: 0.05,

  // Session replay on errors — helps debug what user did before crash
  replaysOnErrorSampleRate: 1.0,

  // Which replays to capture: errors only (not every user session)
  replaysSessionSampleRate: 0,

  // Never send PII (names, emails, etc.) — use scrub attributes instead
  sendDefaultPii: false,

  // Merge with existing integrations (Next.js auto-injects these)
  integrations: (integrations) =>
    integrations.filter((i) => !['BrowserTracing', 'Feedback'].includes(i.name)),

  // Attach deployment context to every event
  initialScope: {
    tags: {
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    },
  },
});