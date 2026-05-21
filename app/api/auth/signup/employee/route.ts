import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  signupBasicSchema,
  employeeProfessionalSchema,
  employeeVerificationSchema,
  employeePricingSchema,
} from '@/shared/schemas/auth.schema';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
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

    // Create user and employee profile
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
            idDocumentType: verificationData.idDocumentType,
            idDocumentUrl: verificationData.idDocumentUrl,
            pricePerCall: pricingData.pricePerCall,
            topics: pricingData.topics,
            bio: pricingData.bio,
            availabilitySlots: pricingData.availabilitySlots,
            payoutMethod: pricingData.payoutMethod,
            payoutDetails: pricingData.upiId || pricingData.bankAccountNumber, // Simple fallback depending on what's available
            verificationStatus: 'PENDING',
          },
        },
      },
      include: {
        employeeProfile: true,
      },
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
  } catch (error: any) {
    console.error('Employee signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create employee account' },
      { status: 500 }
    );
  }
}
