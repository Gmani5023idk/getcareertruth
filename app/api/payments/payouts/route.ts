import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, success, type HandlerSession } from '@/lib/api-handler';
import { requestPayoutSchema, getPayoutsSchema } from '@/shared/schemas/payout.schema';

/** POST /api/payments/payouts — Request a payout for an employee */
export const POST = apiHandler({
  requireAuth: true,
  allowedRoles: ['EMPLOYEE'],
  schema: requestPayoutSchema,
  handler: async ({ body, session }) => {
    const sess = session as import('@/lib/api-handler').HandlerSession;
    const { employeeId } = body;

    // Verify the employee is requesting their own payout
    if (sess.user.id !== employeeId) {
      return NextResponse.json(
        { success: false, error: 'You can only request payouts for your own account', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all completed bookings with PENDING payout status
    const pendingBookings = await prisma.booking.findMany({
      where: {
        employeeId,
        status: 'COMPLETED',
        payoutStatus: 'PENDING',
      },
    });

    if (pendingBookings.length === 0) {
      return success({ message: 'No pending payouts found' });
    }

    // Calculate total payout amount (80% of booking amount, 20% platform fee)
    const totalAmount = pendingBookings.reduce(
      (sum, booking) => sum + booking.amountPaid,
      0
    );
    const payoutAmount = Math.round(totalAmount * 0.8);

    // Update all pending bookings to PROCESSING
    await prisma.booking.updateMany({
      where: {
        id: { in: pendingBookings.map((b) => b.id) },
      },
      data: {
        payoutStatus: 'PROCESSING',
      },
    });

    return success({
      message: 'Payout request created successfully',
      payoutAmount,
      bookingCount: pendingBookings.length,
      bookingIds: pendingBookings.map((b) => b.id),
    });
  },
});

/** GET /api/payments/payouts — Get payout history for an employee */
export const GET = apiHandler({
  requireAuth: true,
  allowedRoles: ['EMPLOYEE'],
  schema: getPayoutsSchema,
  handler: async ({ body, session }) => {
    const sess = session as import('@/lib/api-handler').HandlerSession;
    const { employeeId } = body;

    // Verify the employee is viewing their own payouts
    if (sess.user.id !== employeeId) {
      return NextResponse.json(
        { success: false, error: 'You can only view your own payouts', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all bookings with their payout status
    const bookings = await prisma.booking.findMany({
      where: {
        employeeId,
        status: 'COMPLETED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate totals
    const totalEarnings = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const pendingPayouts = bookings
      .filter((b) => b.payoutStatus === 'PENDING')
      .reduce((sum, b) => sum + b.amountPaid, 0);
    const processingPayouts = bookings
      .filter((b) => b.payoutStatus === 'PROCESSING')
      .reduce((sum, b) => sum + b.amountPaid, 0);
    const paidPayouts = bookings
      .filter((b) => b.payoutStatus === 'PAID')
      .reduce((sum, b) => sum + b.amountPaid, 0);

    return success({
      totalEarnings,
      pendingPayouts,
      processingPayouts,
      paidPayouts,
      availableForPayout: pendingPayouts,
      payoutMethod: employee.payoutMethod,
      payoutDetails: employee.payoutDetails,
      bookings: bookings.map((b) => ({
        id: b.id,
        amount: b.amountPaid,
        payoutStatus: b.payoutStatus,
        createdAt: b.createdAt,
      })),
    });
  },
});
