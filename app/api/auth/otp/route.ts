import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { otpSchema } from '@/shared/schemas/auth.schema';
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTPs in memory (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'send') {
      // Send OTP
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore.set(email, { otp, expiresAt });

      // Send email
      try {
        await resend.emails.send({
          from: 'GetCareerTruth <noreply@getcareertruth.com>',
          to: email,
          subject: 'Verify your email - GetCareerTruth',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #00ACC1;">Verify Your Email</h2>
              <p>Thank you for signing up with GetCareerTruth!</p>
              <p>Your verification code is:</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
              </div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't request this code, please ignore this email.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                GetCareerTruth - Talk to real employees, get real career advice.
              </p>
            </div>
          `,
        });

        return NextResponse.json(
          { message: 'OTP sent successfully' },
          { status: 200 }
        );
      } catch (emailError) {
        console.error('Email send error:', emailError);
        return NextResponse.json(
          { error: 'Failed to send OTP email' },
          { status: 500 }
        );
      }
    } else if (action === 'verify') {
      // Verify OTP
      const { email, otp } = body;

      const validatedData = otpSchema.parse({ email, otp });

      // Check if OTP exists and is valid
      const storedData = otpStore.get(validatedData.email);

      if (!storedData) {
        return NextResponse.json(
          { error: 'OTP not found or expired' },
          { status: 400 }
        );
      }

      if (storedData.expiresAt < new Date()) {
        otpStore.delete(validatedData.email);
        return NextResponse.json(
          { error: 'OTP expired' },
          { status: 400 }
        );
      }

      if (storedData.otp !== validatedData.otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 400 }
        );
      }

      // OTP is valid, remove it
      otpStore.delete(validatedData.email);

      return NextResponse.json(
        { message: 'OTP verified successfully' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('OTP error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process OTP request' },
      { status: 500 }
    );
  }
}
