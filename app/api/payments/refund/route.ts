import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Razorpay from 'razorpay';

const prisma = new PrismaClient();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: true,
        parent: true,
        employee: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status === 'REFUNDED') {
      return NextResponse.json(
        { error: 'Booking has already been refunded' },
        { status: 400 }
      );
    }

    // Check if booking is eligible for refund
    if (booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is not eligible for refund' },
        { status: 400 }
      );
    }

    // Calculate refund amount
    // Full refund if cancelled before call, partial if after
    let refundAmount = booking.amountPaid;
    if (booking.status === 'COMPLETED') {
      // 50% refund if call was completed but user was unsatisfied
      refundAmount = Math.round(booking.amountPaid * 0.5);
    }

    if (!booking.razorpayPaymentId) {
      return NextResponse.json(
        { error: 'Cannot process refund: Payment ID is missing' },
        { status: 400 }
      );
    }

    // Create Razorpay refund
    try {
      const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
        amount: refundAmount * 100, // Convert to paise
        notes: {
          bookingId: booking.id,
          reason: reason || 'Customer requested refund',
        },
      });

      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'REFUNDED',
          refundAmount,
        },
      });

      // In production, you would:
      // 1. Send email notification to user
      // 2. Send email notification to employee
      // 3. Log the refund in your accounting system

      return NextResponse.json(
        {
          message: 'Refund processed successfully',
          refundId: refund.id,
          refundAmount,
          bookingId: booking.id,
        },
        { status: 200 }
      );
    } catch (razorpayError: any) {
      console.error('Razorpay refund error:', razorpayError);

      // If Razorpay refund fails, still update booking status
      // and handle it manually
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          disputeStatus: 'RESOLVED_REFUND',
          refundAmount,
        },
      });

      return NextResponse.json(
        {
          message: 'Refund request created (manual processing required)',
          refundAmount,
          bookingId: booking.id,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error('Refund error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
