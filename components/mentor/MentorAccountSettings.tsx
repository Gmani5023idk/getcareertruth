'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Trash2, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { signOut } from 'next-auth/react';

export default function MentorAccountSettings() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mentors/account', {
        method: 'DELETE',
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete account');
      }

      toast.success('Account closed successfully. We are sorry to see you go!');
      signOut({ callbackUrl: '/' });
    } catch (error) {
      toast.error((error as Error).message);
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 border-error/10 bg-error/[0.01]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-error flex items-center gap-2">
            <Trash2 className="w-6 h-6" />
            Danger Zone
          </h2>
          <p className="text-text-secondary mt-1 font-medium max-w-lg">
            Permanently close your mentor account. This will cancel all future bookings and trigger refunds for students.
          </p>
        </div>
        <Button 
          variant="danger" 
          onClick={() => setShowConfirm(true)}
          className="h-12 px-8 font-black uppercase tracking-widest text-xs"
        >
          Close My Account
        </Button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-xl flex items-center justify-center p-6 z-[200] animate-in fade-in duration-300">
          <Card className="w-full max-w-lg p-10 shadow-2xl border-error/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-error"></div>
            <button 
              onClick={() => setShowConfirm(false)}
              className="absolute top-6 right-6 p-2 hover:bg-surface-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>

            <div className="w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center mb-8">
              <AlertTriangle className="w-10 h-10 text-error" />
            </div>

            <h3 className="text-3xl font-black text-text-primary mb-4 tracking-tight">Are you absolutely sure?</h3>
            <p className="text-text-secondary mb-8 font-medium leading-relaxed">
              This action is irreversible. We will perform the following safety checks:
            </p>
            
            <ul className="space-y-4 mb-10">
              {[
                "Verify no payouts are currently being processed",
                "Ensure all pending earnings are cleared",
                "Cancel future bookings & refund students",
                "Anonymize your personal data"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold text-text-primary">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-14 rounded-2xl bg-surface-2 text-text-primary font-black uppercase tracking-widest text-xs hover:bg-surface-3 transition-colors"
              >
                Go Back
              </button>
              <Button 
                variant="danger" 
                className="flex-[1.5] h-14 shadow-2xl shadow-error/20 font-black uppercase tracking-widest text-xs"
                onClick={handleDeleteAccount}
                isLoading={loading}
              >
                Yes, Close My Account
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
