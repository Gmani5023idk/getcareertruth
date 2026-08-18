'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface EarningsData {
  summary: {
    totalEarned: number;
    pendingPayout: number;
    sessionsDone: number;
  };
  bookings: {
    id: string;
    date: string;
    studentName: string;
    amount: number;
    status: string;
    disputeStatus: string;
  }[];
}

export default function MentorEarningsDashboard() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const res = await fetch('/api/mentors/earnings');
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load earnings');
      setData(result);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!data) return <div className="p-20 text-center text-error font-black">Failed to load earnings data.</div>;

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/20',
    PROCESSING: 'bg-blue-400/10 text-blue-500 border-blue-400/20',
    PAID: 'bg-emerald-400/10 text-emerald-500 border-emerald-400/20',
    FAILED: 'bg-rose-400/10 text-rose-500 border-rose-400/20',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 bg-bg min-h-screen">
      <div>
        <h1 className="text-4xl font-black text-text-primary tracking-tight">Earnings Hub</h1>
        <p className="text-text-secondary mt-1 font-medium text-lg">Detailed overview of your mentoring income and payout status.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-8 border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.03] to-transparent relative overflow-hidden shadow-premium">
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
           <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <DollarSign className="w-6 h-6" />
             </div>
             <span className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Total Earned</span>
           </div>
           <div className="text-5xl font-black text-text-primary tracking-tighter">₹{data.summary.totalEarned}</div>
           <p className="text-[10px] font-bold text-emerald-500 mt-4 uppercase tracking-widest flex items-center gap-2">
             <CheckCircle className="w-3 h-3" /> Successfully Paid
           </p>
        </Card>

        <Card className="p-8 border-blue-500/10 bg-gradient-to-br from-blue-500/[0.03] to-transparent relative overflow-hidden shadow-premium">
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
           <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
               <Clock className="w-6 h-6" />
             </div>
             <span className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Pending Payout</span>
           </div>
           <div className="text-5xl font-black text-text-primary tracking-tighter">₹{data.summary.pendingPayout}</div>
           <p className="text-[10px] font-bold text-blue-500 mt-4 uppercase tracking-widest flex items-center gap-2">
             <Clock className="w-3 h-3" /> In Pipeline
           </p>
        </Card>

        <Card className="p-8 border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent relative overflow-hidden shadow-premium">
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
           <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <TrendingUp className="w-6 h-6" />
             </div>
             <span className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">Sessions Done</span>
           </div>
           <div className="text-5xl font-black text-text-primary tracking-tighter">{data.summary.sessionsDone}</div>
           <p className="text-[10px] font-bold text-primary mt-4 uppercase tracking-widest">Total Guidance Calls</p>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card className="shadow-premium overflow-hidden border-border/50">
        <div className="p-6 border-b border-border bg-surface-2/30 flex justify-between items-center">
          <h2 className="text-xl font-black flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            Recent Transactions
          </h2>
          <div className="px-4 py-1.5 bg-surface-3 rounded-full text-[10px] font-black text-text-muted uppercase tracking-[0.1em]">
            History Log
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-2/50 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted border-b border-border">
                <th className="p-6">Date & Time</th>
                <th className="p-6">Student Information</th>
                <th className="p-6 text-right">Your Fee</th>
                <th className="p-6 text-center">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-24 text-center">
                    <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-text-muted" />
                    </div>
                    <p className="text-text-secondary font-bold">No mentoring history found</p>
                    <p className="text-text-muted text-xs mt-1 italic">Once you complete a session, it will appear here.</p>
                  </td>
                </tr>
              ) : (
                data.bookings.map(b => (
                  <tr key={b.id} className="hover:bg-primary/[0.01] transition-colors group">
                    <td className="p-6 font-bold text-sm text-text-primary">
                      {new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <div className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-tighter">
                        {new Date(b.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="font-black text-text-primary group-hover:text-primary transition-colors">{b.studentName}</div>
                      <div className="text-[10px] text-text-muted font-mono mt-0.5">TXN_{b.id.toUpperCase().substring(0, 12)}</div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="text-xl font-black text-text-primary group-hover:scale-105 transition-transform origin-right">₹{b.amount}</div>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${statusColors[b.status] || 'bg-surface-3 text-text-muted border-border'}`}>
                          {b.status}
                        </span>
                        {b.disputeStatus === 'OPEN' && (
                          <span className="px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-tighter border border-orange-500/20 animate-pulse">
                            Disputed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
