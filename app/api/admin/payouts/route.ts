import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { auditLog, AuditAction } from '@/lib/audit-log';
import { adminRateLimit, extractClientIp } from '@/lib/ratelimit';
import { authorizeRoute } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const authErr = authorizeRoute(session, ['ADMIN']);
    if (authErr) return authErr;

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

    const bookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        employeePayout: { gt: 0 },
      },
      include: {
        employee: {
          select: {
            id: true,
            email: true,
            studentProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    await auditLog({
      userId: session!.user.id,
      action: AuditAction.ADMIN_ACTION,
      entity: 'Payout',
      metadata: { action: 'LIST_PAYOUTS', count: bookings.length },
      success: true,
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Fetch admin payouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
