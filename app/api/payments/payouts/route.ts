import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
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
      return NextResponse.json(
        { message: 'No pending payouts found' },
        { status: 200 }
      );
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

    // In production, you would:
    // 1. Create a payout request with Razorpay/Stripe
    // 2. Send email notification to employee
    // 3. Create a payout record in your database

    return NextResponse.json(
      {
        message: 'Payout request created successfully',
        payoutAmount,
        bookingCount: pendingBookings.length,
        bookingIds: pendingBookings.map((b) => b.id),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Request payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to request payout' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get employee profile
    const employee = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
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

    return NextResponse.json(
      {
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
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get payouts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get payouts' },
      { status: 500 }
    );
  }
}
