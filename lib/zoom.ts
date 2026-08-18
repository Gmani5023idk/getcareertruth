/**
 * Zoom API utility for creating scheduled meetings.
 *
 * Uses OAuth (server-to-server) with environment variables:
 * - ZOOM_ACCOUNT_ID
 * - ZOOM_CLIENT_ID
 * - ZOOM_CLIENT_SECRET
 *
 * All external HTTP calls are wrapped with automatic retry (exponential
 * backoff) to handle transient failures (network blips, 429 rate limits,
 * temporary Zoom API outages).
 *
 * Requires Node.js 18+ (global fetch).
 */

import { withRetry } from '@/lib/retry';

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID!;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;

/**
 * Determine if a Zoom API error is retryable.
 * - 429 (rate limited) → always retry
 * - 5xx (server errors) → retry
 * - 4xx (client errors) → usually not retryable (bad request, auth failure)
 */
function isRetryableZoomError(error: unknown): boolean {
  if (error instanceof Error && error.message.startsWith('Zoom ')) {
    // Extract status code from error message: "Zoom OAuth error: 429 ..."
    const match = error.message.match(/(\d{3})/);
    if (match) {
      const status = parseInt(match[1], 10);
      // Retry on 429 (rate limit) and 5xx (server errors)
      return status === 429 || status >= 500;
    }
  }
  // Network errors (TypeError: fetch failed) are always retryable
  return true;
}

async function getZoomAccessToken(): Promise<string> {
  // Note: deliberately NOT wrapped with withRetry here.
  // The outer createZoomMeeting() already wraps the entire flow (token +
  // meeting creation) in a single retry. An extra retry layer on the token
  // acquisition alone would create a nested retry explosion:
  // 3 (outer) × 3 (inner) = 9 worst-case token attempts.
  // Token failures are either quick 4xx (non-retryable) or transient 5xx/network
  // (the outer retry handles these fine).
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: ZOOM_ACCOUNT_ID,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoom OAuth error: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export interface CreateZoomMeetingOptions {
  userId: string; // Can be user's email or Zoom userId
  scheduledAt: Date;
  durationMins: number;
  topic: string;
  agenda?: string;
}

/**
 * Creates a scheduled Zoom meeting.
 * Returns join_url, start_url, and password.
 */
export async function createZoomMeeting({
  userId,
  scheduledAt,
  durationMins,
  topic,
  agenda,
}: CreateZoomMeetingOptions): Promise<{
  join_url: string;
  start_url?: string;
  password?: string;
}> {
  // The entire create-meeting flow (token acquisition + meeting creation)
  // is wrapped in a single retry to handle transient Zoom API failures.
  // The inner function captures fresh state each retry (new token, new meeting).
  return withRetry(async () => {
    const accessToken = await getZoomAccessToken();

    // Ensure UTC start_time format
    const startTime = scheduledAt.toISOString();

    const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // scheduled meeting
        start_time: startTime,
        duration: durationMins,
        timezone: 'UTC',
        agenda,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          approval_type: 0,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Zoom create meeting error: ${response.status} ${text}`);
    }

    const meeting = await response.json();
    return {
      join_url: meeting.join_url,
      start_url: meeting.start_url,
      password: meeting.password,
    };
  }, {
    maxRetries: 3,
    baseDelayMs: 2000,
    label: 'zoom.createMeeting',
    shouldRetry: isRetryableZoomError,
  });
}
