'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import FeeBreakdownUI from '@/components/booking/FeeBreakdownUI';

declare global {
  interface Window {
    Razorpay: unknown;
  }
}

interface Booking {
  id: string;
  topic: string;
  scheduledAt: string;
  status: string;
  amountPaid: number;
  platformFee: number;
  employeePayout: number;
  notes: string;
  employee: {
    studentProfile: { fullName: string } | null;
    employeeProfile: { fullName: string } | null;
  };
}

export default function BookingPage() {
  const { id: bookingId } = useParams() as { id: string };
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();
      setBooking(data.booking);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load Razorpay script
  useEffect(() => {
    if (booking?.status === 'PENDING_PAYMENT' && !razorpayLoaded) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => setRazorpayLoaded(true);
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [booking?.status, razorpayLoaded]);

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const orderData = await orderRes.json();

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'GetCareerTruth',
        order_id: orderData.orderId,
        handler: async (response: Record<string, string>) => {
          await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          window.location.reload();
        },
      };
      const Razorpay = window.Razorpay as unknown as new (options: Record<string, unknown>) => { open: () => void };
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentLoading(false);
    }
  };

  const renderStatus = () => {
     // ... implementation
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" /></div>;
  if (!booking) return <div className="p-20 text-center">Booking not found.</div>;

  return (
    <div className="min-h-screen bg-bg p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 shadow-premium border-primary/10">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">Booking #{bookingId.slice(0, 8)}</h1>
            <p className="text-text-secondary">{booking.topic}</p>
          </div>
          
          <div className="space-y-6 mb-8">
             <div className="flex items-center gap-4 text-sm font-medium">
               <Calendar className="w-5 h-5 text-primary" />
               <span>{new Date(booking.scheduledAt).toLocaleString()}</span>
             </div>
             {booking.notes && (
               <p className="text-sm text-text-secondary">{booking.notes}</p>
             )}
          </div>

          <div className="border-t border-border pt-8">
            <FeeBreakdownUI 
              sessionFee={booking.employeePayout}
              platformFee={booking.platformFee}
              total={booking.amountPaid}
              onConfirm={handlePayment}
              isLoading={paymentLoading}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
