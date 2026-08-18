/**
 * Resend email utility.
 *
 * Provides simple wrapper for Resend API and common templates
 * for GetCareerTruth notifications.
 *
 * The underlying Resend HTTP call is wrapped with automatic retry
 * (exponential backoff) so transient network failures or Resend API
 * rate limits don't cause silent email delivery failures.
 *
 * Environment variables:
 * - RESEND_API_KEY
 * - RESEND_FROM (optional, default: noreply@getcareertruth.com)
 */

import { withRetry } from '@/lib/retry';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const DEFAULT_FROM = process.env.RESEND_FROM || 'noreply@getcareertruth.com';

/**
 * Determine if a Resend API error is retryable.
 * - 429 (rate limited) → retry
 * - 5xx (server errors) → retry
 * - 4xx (client errors like 401, 403, 422) → don't retry (won't succeed)
 */
function isRetryableEmailError(error: unknown): boolean {
  if (error instanceof Error && error.message.startsWith('Resend error:')) {
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

async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  if (!RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
  }

  return withRetry(async () => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend error: ${response.status} ${err}`);
    }

    return response.json();
  }, {
    maxRetries: 2,
    baseDelayMs: 1000,
    label: 'email.sendResendEmail',
    shouldRetry: isRetryableEmailError,
  });
}

// Specific templates

export async function sendPaymentConfirmedEmail({
  to,
  employeeName,
  bookingTopic,
  scheduledAt,
  meetingLink,
}: {
  to: string;
  employeeName: string;
  bookingTopic: string;
  scheduledAt: Date;
  meetingLink: string;
}) {
  const subject = 'Payment confirmed – Your session is booked';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h2 style="color: #2d3748;">Your payment is confirmed!</h2>
      <p>Hello,</p>
      <p>Your booking with <strong>${employeeName}</strong> has been confirmed.</p>
      <p><strong>Topic:</strong> ${bookingTopic}<br/>
         <strong>Time:</strong> ${scheduledAt.toUTCString()}<br/>
         <strong>Zoom Link:</strong> <a href="${meetingLink}">${meetingLink}</a>
      </p>
      <p>Make sure to join a few minutes early. We look forward to seeing you!</p>
      <p>Best regards,<br/>GetCareerTruth Team</p>
    </div>
  `;
  const text = `Payment confirmed!\n\nBooking with ${employeeName}\nTopic: ${bookingTopic}\nTime: ${scheduledAt.toUTCString()}\nZoom Link: ${meetingLink}\n\nSee you there!`;

  return sendResendEmail({ to, subject, html, text });
}

export async function sendMeetingCreatedEmail({
  to,
  studentName,
  scheduledAt,
  meetingLink,
}: {
  to: string;
  studentName: string;
  scheduledAt: Date;
  meetingLink: string;
}) {
  const subject = 'Your Zoom meeting has been created';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h2 style="color: #2d3748;">Session meeting is ready</h2>
      <p>Hello ${studentName},</p>
      <p>Your Zoom meeting has been created for your scheduled session.</p>
      <p><strong>Time:</strong> ${scheduledAt.toUTCString()}<br/>
         <strong>Join:</strong> <a href="${meetingLink}">${meetingLink}</a>
      </p>
      <p>Please join a few minutes before the scheduled time.</p>
      <p>Best,<br/>GetCareerTruth Team</p>
    </div>
  `;
  const text = `Your Zoom meeting is scheduled for ${scheduledAt.toUTCString()}.\nJoin here: ${meetingLink}`;

  return sendResendEmail({ to, subject, html, text });
}

export async function sendEmployeeApprovalEmail({
  to,
  studentName,
  scheduledAt,
  topic,
}: {
  to: string;
  studentName: string;
  scheduledAt: Date;
  topic: string;
}) {
  const subject = 'Action required: Booking approval';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h2 style="color: #2d3748;">New booking request</h2>
      <p>Hello,</p>
      <p>You have a new booking request from <strong>${studentName}</strong>.</p>
      <p><strong>Topic:</strong> ${topic}<br/>
         <strong>Requested Time:</strong> ${scheduledAt.toUTCString()}
      </p>
      <p>Please review and confirm in your dashboard to enable payment.</p>
      <p>Thank you,<br/>GetCareerTruth Team</p>
    </div>
  `;
  const text = `New booking request:\nStudent: ${studentName}\nTopic: ${topic}\nTime: ${scheduledAt.toUTCString()}\nPlease confirm in dashboard to enable payment.`;

  return sendResendEmail({ to, subject, html, text });
}

export async function sendRefundConfirmationEmail({
  to,
  employeeName,
  refundAmount,
  reason,
  bookingTopic,
}: {
  to: string;
  employeeName: string;
  refundAmount: number;
  reason?: string;
  bookingTopic: string;
}) {
  const subject = 'Refund processed — GetCareerTruth';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h2 style="color: #2d3748;">Your refund has been processed</h2>
      <p>Hello,</p>
      <p>A refund has been issued for your session with <strong>${employeeName}</strong>.</p>
      <p><strong>Topic:</strong> ${bookingTopic}<br/>
         <strong>Amount refunded:</strong> ₹${refundAmount.toLocaleString('en-IN')}<br/>
         ${reason ? `<strong>Reason:</strong> ${reason}<br/>` : ''}
         <strong>Timeline:</strong> The amount will be credited to your original payment method within 5–7 business days.
      </p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br/>GetCareerTruth Team</p>
    </div>
  `;
  const text = `Your refund has been processed.\n\nSession: ${bookingTopic}\nMentor: ${employeeName}\nAmount refunded: ₹${refundAmount.toLocaleString('en-IN')}\n${reason ? `Reason: ${reason}\n` : ''}The amount will be credited within 5–7 business days.`;

  return sendResendEmail({ to, subject, html, text });
}

// Generic send function (if using without template)
export { sendResendEmail as sendEmail };
