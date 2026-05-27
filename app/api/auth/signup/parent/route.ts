import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signupBasicSchema, parentChildSchema } from '@/shared/schemas/auth.schema';
import { checkRateLimit, registrationRateLimit, extractClientIp } from '@/lib/ratelimit';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 accounts per hour per IP
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(registrationRateLimit, ip, 'registration-parent');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

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

    // Audit log
    await auditLog({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entity: 'User',
      entityId: user.id,
      metadata: { role: 'PARENT', email: user.email },
      ipAddress: ip,
      success: true,
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
