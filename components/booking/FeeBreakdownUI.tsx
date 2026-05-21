'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Info } from 'lucide-react';

interface FeeBreakdownProps {
  sessionFee: number;
  platformFee: number;
  total: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function FeeBreakdownUI({
  sessionFee,
  platformFee,
  total,
  onConfirm,
  isLoading,
}: FeeBreakdownProps) {
  return (
    <Card className="p-6 border-primary/10 bg-gradient-to-b from-surface to-primary/[0.02]">
      <h3 className="text-xl font-black mb-6 text-text-primary">Payment Breakdown</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary font-medium">Session Fee</span>
          <span className="text-base font-bold text-text-primary">₹{sessionFee}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 group">
            <span className="text-text-secondary font-medium">Platform Fee</span>
            <div className="relative">
              <Info className="w-3.5 h-3.5 text-text-muted cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-text-primary text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                Platform fee covers 24/7 support, secure video infrastructure, and payment processing.
              </div>
            </div>
          </div>
          <span className="text-base font-bold text-text-primary">₹{platformFee}</span>
        </div>
        <div className="h-px bg-border my-2"></div>
        <div className="flex justify-between items-end">
          <span className="text-lg font-black text-text-primary uppercase tracking-tighter">Total Payable</span>
          <span className="text-2xl font-black text-primary">₹{total}</span>
        </div>
      </div>

      <Button 
        className="w-full h-12 shadow-xl shadow-primary/20 font-bold" 
        onClick={onConfirm}
        isLoading={isLoading}
      >
        Confirm & Pay ₹{total}
      </Button>
      
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest">
        <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Secure SSL Encrypted Payment
      </div>
    </Card>
  );
}
