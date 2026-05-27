import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/shared/schemas/auth.schema';
import { validateUser } from '@/lib/auth';
import { checkRateLimit, loginRateLimit, extractClientIp } from '@/lib/ratelimit';
import { auditLog, AuditAction } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 attempts per 15 minutes per IP
    const ip = extractClientIp(req);
    const rateLimitResult = await checkRateLimit(loginRateLimit, ip, 'login');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const user = await validateUser(validatedData.email, validatedData.password);

    // Audit log for successful login
    await auditLog({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
      success: true,
    });

    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.studentProfile?.fullName || user.employeeProfile?.fullName || user.parentProfile?.fullName || user.email,
          email: user.email,
          role: user.role,
          phone: user.phone,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    let message = 'An unexpected error occurred';
    let status = 500;

    if (error.name === 'ZodError') {
      message = 'Invalid input data';
      status = 400;
    } else if (error.message === 'USER_NOT_FOUND') {
      message = 'No account found with this email';
      status = 401;
      // Audit log for failed login
      try {
        const body = await req.clone().json().catch(() => ({}));
        await auditLog({
          action: AuditAction.USER_LOGIN_FAILED,
          entity: 'User',
          metadata: { email: body.email, reason: 'USER_NOT_FOUND' },
          ipAddress: extractClientIp(req),
          success: false,
        });
      } catch {}
    } else if (error.message === 'INVALID_PASSWORD') {
      message = 'Incorrect password';
      status = 401;
      // Audit log for failed login
      try {
        const body = await req.clone().json().catch(() => ({}));
        await auditLog({
          action: AuditAction.USER_LOGIN_FAILED,
          entity: 'User',
          metadata: { email: body.email, reason: 'INVALID_PASSWORD' },
          ipAddress: extractClientIp(req),
          success: false,
        });
      } catch {}
    } else if (error.message === 'SOCIAL_AUTH_ONLY') {
      message = 'Please use Google to sign in to this account';
      status = 401;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
