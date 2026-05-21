'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import toast from 'react-hot-toast';

export default function MentorApplicationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'BANK' | 'UPI'>('BANK');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      collegeName: formData.get('collegeName'),
      currentYear: formData.get('currentYear'),
      branch: formData.get('branch'),
      domain: formData.get('domain'),
      bio: formData.get('bio'),
      linkedinUrl: formData.get('linkedinUrl'),
      sessionRate: parseInt(formData.get('sessionRate') as string),
      bankAccountNumber: formData.get('bankAccountNumber'),
      bankIFSC: formData.get('bankIFSC'),
      upiId: formData.get('upiId'),
    };

    try {
      const res = await fetch('/api/mentors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit application');
      }

      toast.success("Application submitted! We'll review and notify you within 48 hours.");
      router.push('/student'); // Redirect to dashboard
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl mb-4">
            Become a Mentor
          </h1>
          <p className="text-xl text-text-secondary">
            Share your experience with juniors and earn from every session.
          </p>
        </div>

        <Card className="p-8 shadow-premium">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">College Name</label>
                <input 
                  name="collegeName" 
                  required 
                  className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  placeholder="e.g. IIT Bombay" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Current Year</label>
                <input 
                  name="currentYear" 
                  required 
                  className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  placeholder="e.g. 3rd Year" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Branch</label>
                <input 
                  name="branch" 
                  required 
                  className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  placeholder="e.g. Computer Science" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Expertise Domain</label>
                <input 
                  name="domain" 
                  required 
                  className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                  placeholder="e.g. MBA Prep, Placements" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Bio (Tell juniors how you can help)</label>
              <textarea 
                name="bio" 
                className="w-full p-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px]" 
                placeholder="I successfully cleared CAT with 99.9 percentile and can guide you on prep strategy..." 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">LinkedIn Profile (Recommended)</label>
              <input 
                name="linkedinUrl" 
                type="url" 
                className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="https://linkedin.com/in/yourprofile" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Your Session Rate (₹ per session)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold">₹</span>
                <input 
                  name="sessionRate" 
                  type="number" 
                  required 
                  min="1" 
                  className="w-full h-12 pl-8 pr-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold" 
                  placeholder="500" 
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Platform fee of 15% will be added to this for the student.</p>
            </div>

            <div className="border-t border-border pt-8 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-accent font-bold">₹</span>
                </div>
                <h3 className="text-lg font-bold">Payout Information</h3>
              </div>
              <p className="text-sm text-text-secondary mb-6">Choose how you'd like to receive your earnings.</p>
              
              <div className="flex p-1 bg-surface-3 rounded-xl mb-6 w-fit">
                <button 
                  type="button"
                  onClick={() => setPayoutMethod('BANK')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${payoutMethod === 'BANK' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Bank Transfer
                </button>
                <button 
                  type="button"
                  onClick={() => setPayoutMethod('UPI')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${payoutMethod === 'UPI' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  UPI ID
                </button>
              </div>

              {payoutMethod === 'BANK' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Account Number</label>
                    <input 
                      name="bankAccountNumber" 
                      required={payoutMethod === 'BANK'} 
                      className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">IFSC Code</label>
                    <input 
                      name="bankIFSC" 
                      required={payoutMethod === 'BANK'} 
                      className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all uppercase" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">UPI ID</label>
                  <input 
                    name="upiId" 
                    required={payoutMethod === 'UPI'} 
                    className="w-full h-12 px-4 rounded-xl border border-border bg-surface-2 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    placeholder="e.g. yourname@okaxis" 
                  />
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              isLoading={loading}
              size="lg"
            >
              Submit Application
            </Button>
            
            <p className="text-center text-xs text-text-muted px-8">
              By submitting, you agree to GetCareerTruth's mentor terms and conditions. We'll verify your details before making your profile live.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
