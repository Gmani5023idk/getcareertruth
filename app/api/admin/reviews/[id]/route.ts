import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import { captureError } from '@/lib/sentry-server';
import { authorizeRoute } from '@/lib/auth-utils';

/**
 * PATCH /api/admin/reviews/[id]
 *
 * Approve or reject a review.
 * Auth: ADMIN only.
 *
 * Body: { action: 'approve' | 'reject' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { action } = await req.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { isPublic: action === 'approve' },
      select: { id: true, isPublic: true },
    });

    // Audit log — session is narrowed to AuthenticatedSession after authorizeRoute
    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: action === 'approve' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
        entity: 'Review',
        entityId: id,
        success: true,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    const msg = captureError(error, `PATCH /api/admin/reviews/[id]`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/reviews/[id]
 *
 * Delete a review (admin only).
 * Auth: ADMIN only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const authErr = authorizeRoute(session, ['ADMIN']);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await prisma.review.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'REVIEW_DELETED',
        entity: 'Review',
        entityId: id,
        success: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = captureError(error, `DELETE /api/admin/reviews/[id]`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}