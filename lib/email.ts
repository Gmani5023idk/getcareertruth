/**
 * Resend email utility.
 *
 * Provides simple wrapper for Resend API and common templates
 * for GetCareerTruth notifications.
 *
 * Environment variables:
 * - RESEND_API_KEY
 * - RESEND_FROM (optional, default: noreply@getcareertruth.com)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const DEFAULT_FROM = process.env.RESEND_FROM || 'noreply@getcareertruth.com';

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

// Generic send function (if using without template)
export { sendResendEmail as sendEmail };
