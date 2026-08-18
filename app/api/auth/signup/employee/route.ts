import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import {
  signupBasicSchema,
  employeeProfessionalSchema,
  employeeVerificationSchema,
  employeePricingSchema,
} from '@/shared/schemas/auth.schema';
import { checkRateLimit, registrationRateLimit, extractClientIp } from '@/lib/ratelimit';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 accounts per hour per IP
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(registrationRateLimit, ip, 'registration-employee');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await req.json();

    // Validate all steps
    const basicData = signupBasicSchema.parse(body.basic);
    const professionalData = employeeProfessionalSchema.parse(body.professional);
    const verificationData = employeeVerificationSchema.parse(body.verification);
    const pricingData = employeePricingSchema.parse(body.pricing);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: basicData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(basicData.password, 10);

    // Create user and employee profile (with include to access nested employeeProfile in return)
    const user = await prisma.user.create({
      data: {
        email: basicData.email,
        phone: basicData.phone,
        passwordHash: hashedPassword,
        role: 'EMPLOYEE',
        employeeProfile: {
          create: {
            fullName: basicData.fullName,
            company: professionalData.company,
            jobTitle: professionalData.jobTitle,
            industry: professionalData.industry,
            yearsExp: professionalData.yearsExp,
            linkedInUrl: professionalData.linkedInUrl,
            companyEmail: verificationData.companyEmail,
            pricePerCall: pricingData.pricePerCall,
            topics: pricingData.topics,
            bio: pricingData.bio,
            payoutMethod: pricingData.payoutMethod,
            payoutDetails: pricingData.upiId || pricingData.bankAccountNumber, // Simple fallback depending on what's available
            verificationStatus: 'PENDING',
            // Fix 1: Create availability slots relationally (replaces old JSON field)
            availabilitySlots: {
              createMany: {
                data: pricingData.availabilitySlots.map((slot: { dayOfWeek: number; startTime: string; endTime: string; timezone?: string }) => ({
                  dayOfWeek: slot.dayOfWeek,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  timezone: slot.timezone || 'Asia/Kolkata',
                })),
              },
            },
          },
        },
      },
      include: { employeeProfile: true },
    });

    // Audit log
    await auditLog({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entity: 'User',
      entityId: user.id,
      metadata: { role: 'EMPLOYEE', email: user.email },
      ipAddress: ip,
      success: true,
    });

    return NextResponse.json(
      {
        message: 'Employee account created successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.employeeProfile?.fullName,
          verificationStatus: user.employeeProfile?.verificationStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Employee signup error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create employee account' },
      { status: 500 }
    );
  }
}
