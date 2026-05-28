import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { captureError } from '@/lib/sentry-server';
import { authorizeRoute } from '@/lib/auth-utils';

/**
 * GET /api/admin/users
 *
 * List all users with pagination, search, and filters.
 * Auth: ADMIN only.
 *
 * Query params:
 *   page (default 1), limit (default 20, max 100)
 *   search (optional — name or email)
 *   role (optional — STUDENT | EMPLOYEE | PARENT | ADMIN)
 *   banned (optional — true/false)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || undefined;
    const role = searchParams.get('role') || undefined;
    const banned = searchParams.get('banned');

    const where: Record<string, unknown> = {};

    if (role) where.role = role;
    if (banned === 'true') where.isBanned = true;
    if (banned === 'false') where.isBanned = false;

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { studentProfile: { fullName: { contains: search, mode: 'insensitive' } } },
        { employeeProfile: { fullName: { contains: search, mode: 'insensitive' } } },
        { parentProfile: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: {
          studentProfile: { select: { fullName: true, phone: true } },
          employeeProfile: { select: { fullName: true, company: true, jobTitle: true, verificationStatus: true } },
          parentProfile: { select: { fullName: true, phone: true } },
          _count: { select: { bookingsAsStudent: true, bookingsAsEmployee: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
      name:
        u.studentProfile?.fullName ||
        u.employeeProfile?.fullName ||
        u.parentProfile?.fullName ||
        'Unknown',
      profile:
        u.employeeProfile ||
        u.parentProfile ||
        null,
      bookingCount: (u._count?.bookingsAsStudent ?? 0) + (u._count?.bookingsAsEmployee ?? 0),
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: formatted,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    const msg = captureError(error, 'GET /api/admin/users');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 *
 * Toggle ban status for a user.
 * Auth: ADMIN only.
 * Body: { userId: string, action: 'ban' | 'unban' }
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { userId, action } = await req.json();
    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    const isBanned = action === 'ban';

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      select: { id: true, email: true, isBanned: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: isBanned ? 'USER_BANNED' : 'USER_UNBANNED',
        entity: 'User',
        entityId: user.id,
        metadata: { targetEmail: user.email },
        success: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    const msg = captureError(error, 'PATCH /api/admin/users');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}