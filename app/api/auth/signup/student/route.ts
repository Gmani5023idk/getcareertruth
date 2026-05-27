import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signupBasicSchema, studentEducationSchema, studentGoalsSchema } from '@/shared/schemas/auth.schema';
import { checkRateLimit, registrationRateLimit, extractClientIp } from '@/lib/ratelimit';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 accounts per hour per IP
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(registrationRateLimit, ip, 'registration-student');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

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

    // Audit log
    await auditLog({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entity: 'User',
      entityId: user.id,
      metadata: { role: 'STUDENT', email: user.email },
      ipAddress: ip,
      success: true,
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
