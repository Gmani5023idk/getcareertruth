'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { ShieldAlert, User, CreditCard, ChevronRight, CheckCircle, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Dispute {
  id: string;
  amountPaid: number;
  employeePayout: number;
  updatedAt: string;
  employee: {
    email: string;
    studentProfile: { fullName: string } | null;
  };
  student?: {
    email: string;
    studentProfile: { fullName: string } | null;
  };
  parent?: {
    email: string;
    parentProfile: { fullName: string } | null;
  };
}

export default function AdminDisputesPanel() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const res = await fetch('/api/admin/disputes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch disputes');
      setDisputes(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resolveDispute = async (bookingId: string, outcome: 'RESOLVED_PAY' | 'RESOLVED_REFUND') => {
    setProcessingId(bookingId);
    try {
      const res = await fetch('/api/admin/disputes/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, outcome }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to resolve dispute');
      }

      toast.success(outcome === 'RESOLVED_PAY' ? 'Payout approved!' : 'Refund processed successfully!');
      setDisputes(prev => prev.filter(d => d.id !== bookingId));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 bg-bg min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-10 h-10 text-orange-500" />
            Dispute Resolution
          </h1>
          <p className="text-text-secondary mt-1 font-medium">Review and resolve contested sessions to release funds or issue refunds.</p>
        </div>
        <div className="bg-orange-500/10 text-orange-600 px-4 py-2 rounded-xl border border-orange-500/20 font-black text-sm uppercase tracking-widest">
          {disputes.length} Open Cases
        </div>
      </div>

      {disputes.length === 0 ? (
        <Card className="p-32 text-center border-dashed border-2 border-border/50">
           <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className="w-10 h-10 text-emerald-500" />
           </div>
           <h2 className="text-2xl font-black text-text-primary uppercase tracking-tighter">Zero Disputes</h2>
           <p className="text-text-muted mt-2">The platform is currently operating smoothly without any active conflicts.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {disputes.map(dispute => {
            const studentName = dispute.student?.studentProfile?.fullName || dispute.parent?.parentProfile?.fullName || 'Anonymous Student';
            const mentorName = dispute.employee.studentProfile?.fullName || 'Anonymous Mentor';

            return (
              <Card key={dispute.id} className="p-0 overflow-hidden shadow-premium border-orange-500/10 group hover:border-orange-500/30 transition-all">
                <div className="grid grid-cols-1 lg:grid-cols-4 items-stretch">
                  
                  {/* Case Info */}
                  <div className="p-8 border-r border-border bg-surface-2/30">
                    <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-4">Case #ID</div>
                    <div className="text-sm font-mono font-bold text-text-primary mb-6">{dispute.id.toUpperCase()}</div>
                    <div className="flex items-center gap-3 text-text-secondary mb-2">
                       <CreditCard className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-widest">Transaction</span>
                    </div>
                    <div className="text-3xl font-black text-text-primary tracking-tighter">₹{dispute.amountPaid}</div>
                    <div className="text-[10px] font-medium text-text-muted mt-1 italic">Student paid full amount</div>
                  </div>

                  {/* Parties */}
                  <div className="p-8 col-span-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Mentor</p>
                            <p className="text-base font-black text-text-primary">{mentorName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-text-secondary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Student / Parent</p>
                            <p className="text-base font-black text-text-primary">{studentName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="hidden md:block">
                         <ChevronRight className="w-8 h-8 text-border group-hover:text-orange-500 transition-colors" />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-8 bg-surface-2/50 border-l border-border flex flex-col justify-center gap-4">
                     <Button 
                       className="w-full gap-2 shadow-lg shadow-emerald-500/10" 
                       variant="primary" 
                       onClick={() => resolveDispute(dispute.id, 'RESOLVED_PAY')}
                       isLoading={processingId === dispute.id}
                     >
                       <CheckCircle className="w-4 h-4" /> Resolve & Pay Mentor
                     </Button>
                     <Button 
                       className="w-full gap-2 shadow-lg shadow-rose-500/10 bg-white border-rose-500 text-rose-500 hover:bg-rose-50" 
                       variant="secondary"
                       onClick={() => resolveDispute(dispute.id, 'RESOLVED_REFUND')}
                       isLoading={processingId === dispute.id}
                     >
                       <RefreshCcw className="w-4 h-4" /> Resolve & Full Refund
                     </Button>
                  </div>

                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
