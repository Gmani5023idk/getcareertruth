import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { auditLog, AuditAction } from '@/lib/audit-log';
import { adminRateLimit, extractClientIp } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Defence-in-depth: admin rate limiting
    const clientIp = extractClientIp(req);
    try {
      const result = await adminRateLimit.limit(`admin:handler:${clientIp}`);
      if (!result.success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } catch (rateLimitError) {
      console.error('Admin rate limit error (allowing):', rateLimitError);
    }

    const applications = await prisma.mentorApplication.findMany({
      where: {
        status: 'PENDING_ADMIN_REVIEW',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await auditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_ACTION,
      entity: 'MentorApplication',
      metadata: { action: 'LIST_APPLICATIONS', count: applications.length },
      success: true,
    });

    return NextResponse.json(applications);
  } catch (error: any) {
    console.error('Fetch mentor applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
