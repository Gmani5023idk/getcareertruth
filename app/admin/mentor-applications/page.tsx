'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  collegeName: string;
  domain: string;
  sessionRate: number;
  bankAccountNumber?: string;
  bankIFSC?: string;
  upiId?: string;
  status: string;
  user: {
    email: string;
    studentProfile: {
      fullName: string;
    } | null;
  };
}

export default function AdminMentorApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/mentor-applications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setApplications(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/mentor-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to approve');
      }

      toast.success('Application approved!');
      setApplications(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      const res = await fetch(`/api/admin/mentor-applications/${rejectingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionReason }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to reject');
      }

      toast.success('Application rejected');
      setApplications(prev => prev.filter(a => a.id !== rejectingId));
      setRejectingId(null);
      setRejectionReason('');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">Mentor Applications</h1>
            <p className="text-text-secondary mt-2">Review and approve senior student mentor profiles.</p>
          </div>
          <div className="bg-surface-2 px-4 py-2 rounded-xl border border-border">
            <span className="text-primary font-bold">{applications.length}</span>
            <span className="text-text-secondary ml-2 text-sm font-medium">Pending Review</span>
          </div>
        </div>
        
        {applications.length === 0 ? (
          <Card className="p-20 text-center flex flex-col items-center justify-center border-dashed border-2">
            <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-1">All Caught Up!</h2>
            <p className="text-text-secondary">No pending mentor applications at the moment.</p>
          </Card>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-premium">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-bottom border-border">
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Applicant Info</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Education & Domain</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Session Rate</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Payout Method</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map(app => {
                    const hasPayout = !!(app.upiId || (app.bankAccountNumber && app.bankIFSC));
                    return (
                      <tr key={app.id} className="hover:bg-surface-2/50 transition-all duration-200">
                        <td className="p-5">
                          <div className="font-bold text-text-primary text-base">{app.user.studentProfile?.fullName || 'Anonymous User'}</div>
                          <div className="text-sm text-text-muted">{app.user.email}</div>
                        </td>
                        <td className="p-5">
                          <div className="text-sm font-medium text-text-primary">{app.collegeName}</div>
                          <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-tighter">
                            {app.domain}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="text-lg font-black text-primary">₹{app.sessionRate}</div>
                          <div className="text-[10px] uppercase font-bold text-text-muted">Per Session</div>
                        </td>
                        <td className="p-5">
                          {app.upiId ? (
                            <div className="bg-surface-3 p-3 rounded-xl border border-border inline-block min-w-[140px]">
                              <span className="text-[10px] font-black uppercase text-text-muted block mb-1">UPI ID</span>
                              <span className="text-sm font-mono font-bold text-text-primary">{app.upiId}</span>
                            </div>
                          ) : app.bankAccountNumber ? (
                            <div className="bg-surface-3 p-3 rounded-xl border border-border inline-block min-w-[140px]">
                              <span className="text-[10px] font-black uppercase text-text-muted block mb-1">Bank Account</span>
                              <span className="text-sm font-mono font-bold text-text-primary">{app.bankAccountNumber}</span>
                              <span className="text-[10px] font-bold text-text-secondary block mt-1">{app.bankIFSC}</span>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-[10px] font-black uppercase tracking-widest border border-error/20">Missing Details</span>
                          )}
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <Button 
                              size="sm" 
                              onClick={() => handleApprove(app.id)}
                              disabled={!hasPayout}
                              className={!hasPayout ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                              title={!hasPayout ? "Payout details missing — cannot approve" : "Approve and activate mentor profile"}
                            >
                              Approve
                            </Button>
                            <Button 
                              variant="danger" 
                              size="sm"
                              onClick={() => setRejectingId(app.id)}
                              title="Reject application"
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-md flex items-center justify-center p-6 z-[100] animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-8 shadow-2xl border-error/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-error"></div>
            <h3 className="text-2xl font-black text-text-primary mb-2">Reject Application</h3>
            <p className="text-text-secondary text-sm mb-6">Please provide a clear reason for rejection. This will be emailed to the student.</p>
            
            <textarea
              className="w-full p-4 rounded-xl border border-border bg-surface-2 focus:border-error focus:ring-4 focus:ring-error/10 outline-none transition-all h-40 mb-8 text-text-primary font-medium"
              placeholder="e.g. Please provide a valid LinkedIn profile or more details about your expertise..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
            />
            
            <div className="flex items-center justify-end gap-4">
              <button 
                onClick={() => setRejectingId(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                Go Back
              </button>
              <Button 
                variant="danger" 
                onClick={handleReject} 
                disabled={!rejectionReason.trim()}
                className="px-8 shadow-lg shadow-error/20"
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
