/**
 * Zoom API utility for creating scheduled meetings.
 *
 * Uses OAuth (server-to-server) with environment variables:
 * - ZOOM_ACCOUNT_ID
 * - ZOOM_CLIENT_ID
 * - ZOOM_CLIENT_SECRET
 *
 * Requires Node.js 18+ (global fetch).
 */

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID!;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!;

async function getZoomAccessToken(): Promise<string> {
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
}
