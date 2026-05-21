import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signupBasicSchema, studentEducationSchema, studentGoalsSchema } from '@/shared/schemas/auth.schema';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate all steps
    const basicData = signupBasicSchema.parse(body.basic);
    const educationData = studentEducationSchema.parse(body.education);
    const goalsData = studentGoalsSchema.parse(body.goals);

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

    // Create user and student profile
    const user = await prisma.user.create({
      data: {
        email: basicData.email,
        phone: basicData.phone,
        passwordHash: hashedPassword,
        role: 'STUDENT',
        studentProfile: {
          create: {
            fullName: basicData.fullName,
            educationType: educationData.educationType,
            schoolName: educationData.schoolName,
            className: educationData.className,
            stream: educationData.stream || null,
            collegeName: educationData.collegeName || null,
            degree: educationData.degree || null,
            branch: educationData.branch || null,
            currentYear: educationData.currentYear || null,
            collegeEmail: educationData.collegeEmail || null,
            city: educationData.city || null,
            targetIndustries: goalsData.targetIndustries,
            targetCompanies: goalsData.targetCompanies || [],
            bio: goalsData.bio,
            savedEmployees: [],
          },
        },
      },
      include: {
        studentProfile: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Student account created successfully',
        user: {
          id: user.id,
          name: user.studentProfile?.fullName,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Student signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create student account' },
      { status: 500 }
    );
  }
}
