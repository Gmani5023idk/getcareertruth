'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { AlertCircle, CheckCircle2, Clock, History, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PayoutBooking {
  id: string;
  employeeId: string;
  employeePayout: number;
  payoutStatus: string;
  updatedAt: string;
  employee: {
    email: string;
    studentProfile: { fullName: string } | null;
  };
}

export default function AdminPayoutsPanel() {
  const [bookings, setBookings] = useState<PayoutBooking[]>([]);
  const [loading, setLoading] = useState(true);
type PayoutTab = 'FAILED' | 'PROCESSING' | 'PAID' | 'PENDING';

  const [activeTab, setActiveTab] = useState<PayoutTab>('FAILED');

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const res = await fetch('/api/admin/payouts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch payouts');
      setBookings(data);
    } catch (error) {
      toast.error(error instanceof Error ? (error as Error).message : 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (bookingId: string) => {
    try {
      const res = await fetch('/api/payouts/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to retry');
      }

      toast.success('Payout retried successfully!');
      fetchPayouts();
    } catch (error) {
      toast.error(error instanceof Error ? (error as Error).message : 'Failed to retry payout');
    }
  };

  const filtered = bookings.filter(b => b.payoutStatus === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const TabIcon = {
    FAILED: AlertCircle,
    PROCESSING: Clock,
    PAID: CheckCircle2,
    PENDING: History,
  }[activeTab];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 bg-bg min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight">Payout Management</h1>
          <p className="text-text-secondary mt-1 font-medium">Monitor and process mentor session payouts.</p>
        </div>
        <div className="bg-surface-2 p-1.5 rounded-xl flex items-center gap-2 border border-border">
           <button onClick={fetchPayouts} className="p-2 hover:bg-surface-3 rounded-lg transition-colors text-text-secondary">
             <RotateCcw className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex p-1.5 bg-surface-2 rounded-2xl w-fit shadow-inner border border-border/50">
        {[
          { id: 'FAILED', label: 'Failed', icon: AlertCircle, color: 'text-error', bgColor: 'bg-error/10' },
          { id: 'PROCESSING', label: 'Processing', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
          { id: 'PAID', label: 'Paid', icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
          { id: 'PENDING', label: 'Pending', icon: History, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PayoutTab)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 ${
              activeTab === tab.id 
              ? 'bg-surface shadow-xl text-text-primary scale-[1.02]' 
              : 'text-text-secondary hover:text-text-primary grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
            }`}
          >
            <div className={`p-1 rounded-md ${activeTab === tab.id ? tab.bgColor : ''}`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
            </div>
            {tab.label}
            <span className={`ml-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${activeTab === tab.id ? 'bg-primary text-white border-primary' : 'bg-surface-3 text-text-muted border-border'}`}>
              {bookings.filter(b => b.payoutStatus === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      <Card className="shadow-premium overflow-hidden border-border/50 relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-2/70 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted border-b border-border">
                <th className="p-6">Mentor Details</th>
                <th className="p-6">Payout Amount</th>
                <th className="p-6">Timestamp</th>
                <th className="p-6 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-32 text-center">
                    <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-border/50">
                      <TabIcon className="w-10 h-10 text-text-muted opacity-30" />
                    </div>
                    <p className="text-text-secondary font-black text-xl uppercase tracking-tighter">No transactions found</p>
                    <p className="text-text-muted text-sm mt-1 italic">The {activeTab.toLowerCase()} queue is currently empty.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-primary/[0.01] transition-all group">
                    <td className="p-6">
                      <div className="font-black text-text-primary text-base group-hover:text-primary transition-colors">{b.employee.studentProfile?.fullName || 'Anonymous User'}</div>
                      <div className="text-xs text-text-muted font-medium flex items-center gap-1.5 mt-1">
                        <span className="w-1 h-1 rounded-full bg-text-muted opacity-30"></span>
                        {b.employee.email}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-2xl font-black text-text-primary tracking-tighter">₹{b.employeePayout}</div>
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Net Earnings</div>
                    </td>
                    <td className="p-6">
                      <div className="text-sm font-black text-text-primary uppercase">
                        {new Date(b.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-tighter">
                        {new Date(b.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      {b.payoutStatus === 'FAILED' && (
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleRetry(b.id)}
                          className="gap-2 px-6 h-10 shadow-lg shadow-primary/20 group/btn"
                        >
                          <RotateCcw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" /> Retry Payout
                        </Button>
                      )}
                      {b.payoutStatus === 'PAID' && (
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                           <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.1em]">Verified Payment</span>
                        </div>
                      )}
                      {b.payoutStatus === 'PROCESSING' && (
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 gap-2">
                           <div className="w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.1em]">Banking Pipeline</span>
                        </div>
                      )}
                      {b.payoutStatus === 'PENDING' && (
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 gap-2">
                           <span className="text-[10px] font-black uppercase text-yellow-600 tracking-[0.1em]">Awaiting Trigger</span>
                        </div>
                      )}
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
