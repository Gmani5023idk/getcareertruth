import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signupBasicSchema, parentChildSchema } from '@/shared/schemas/auth.schema';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate all steps
    const basicData = signupBasicSchema.parse(body.basic);
    const childData = parentChildSchema.parse(body.child);

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

    // Create user and parent profile
    const user = await prisma.user.create({
      data: {
        email: basicData.email,
        phone: basicData.phone,
        passwordHash: hashedPassword,
        role: 'PARENT',
        parentProfile: {
          create: {
            fullName: basicData.fullName,
            city: null, // city is not provided in schemas currently
            childStage: childData.childStage,
            childCourse: childData.childCourse,
            concerns: childData.concerns,
            openToConnect: childData.openToConnect ?? true,
          },
        },
      },
      include: {
        parentProfile: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Parent account created successfully',
        user: {
          id: user.id,
          name: user.parentProfile?.fullName,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Parent signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create parent account' },
      { status: 500 }
    );
  }
}
