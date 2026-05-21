import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// List of known college domains (can be expanded)
const COLLEGE_DOMAINS = [
  'iit.ac.in',
  'iim.ac.in',
  'nit.ac.in',
  'bits-pilani.ac.in',
  'vit.ac.in',
  'srmap.edu.in',
  'manipal.edu',
  'amrita.edu',
  'annauniv.edu',
  'jntu.ac.in',
  'osmania.ac.in',
  'uohyd.ac.in',
  'du.ac.in',
  'jnu.ac.in',
  'iisc.ac.in',
  'cbse.ac.in',
  'icbse.com',
  'edu',
  'ac.in',
  'edu.in',
];

// Check if email is from a college domain
function isCollegeEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  // Check against known college domains
  if (COLLEGE_DOMAINS.some((collegeDomain) => domain.endsWith(collegeDomain))) {
    return true;
  }

  // Check if domain contains common college keywords
  const collegeKeywords = ['college', 'university', 'institute', 'school', 'academy'];
  return collegeKeywords.some((keyword) => domain.includes(keyword));
}

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

    if (action === 'check') {
      // Check if email is from a college
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      const isCollege = isCollegeEmail(email);

      return NextResponse.json(
        { isCollege, message: isCollege ? 'College email detected' : 'Not a college email' },
        { status: 200 }
      );
    } else if (action === 'send') {
      // Send OTP to college email
      const { email } = body;

      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      if (!isCollegeEmail(email)) {
        return NextResponse.json(
          { error: 'Not a college email' },
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
          subject: 'Verify your college email - GetCareerTruth',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #00ACC1;">Verify Your College Email</h2>
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
          { message: 'OTP sent to college email successfully' },
          { status: 200 }
        );
      } catch (emailError: any) {
        console.error('Email send error:', emailError);
        return NextResponse.json(
          { error: 'Failed to send OTP email' },
          { status: 500 }
        );
      }
    } else if (action === 'verify') {
      // Verify OTP
      const { email, otp } = body;

      if (!email || !otp) {
        return NextResponse.json(
          { error: 'Email and OTP are required' },
          { status: 400 }
        );
      }

      // Check if OTP exists and is valid
      const storedData = otpStore.get(email);

      if (!storedData) {
        return NextResponse.json(
          { error: 'OTP not found or expired' },
          { status: 400 }
        );
      }

      if (storedData.expiresAt < new Date()) {
        otpStore.delete(email);
        return NextResponse.json(
          { error: 'OTP expired' },
          { status: 400 }
        );
      }

      if (storedData.otp !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP' },
          { status: 400 }
        );
      }

      // OTP is valid, remove it
      otpStore.delete(email);

      return NextResponse.json(
        { message: 'College email verified successfully' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('College email verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process college email verification' },
      { status: 500 }
    );
  }
}
