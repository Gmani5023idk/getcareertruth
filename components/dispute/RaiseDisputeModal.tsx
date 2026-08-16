'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, CheckCircle, X } from 'lucide-react';
import Button from '@/components/ui/Button';

interface RaiseDisputeModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RaiseDisputeModal({ bookingId, isOpen, onClose, onSuccess }: RaiseDisputeModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to raise dispute');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        onClose();
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setReason('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-text-primary">Raise a Dispute</h3>
                    <p className="text-sm text-text-secondary">We&apos;ll review your case within 24 hours</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-surface-2 rounded-xl transition-colors text-text-secondary hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success State */}
              {success ? (
                <div className="text-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-success" />
                  </motion.div>
                  <h4 className="text-lg font-black text-text-primary mb-1">Dispute Raised!</h4>
                  <p className="text-sm text-text-secondary">
                    An admin will review your case. You&apos;ll be notified of the outcome.
                  </p>
                </div>
              ) : (
                <>
                  {/* Reason Textarea */}
                  <div className="space-y-2 mb-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1 block">
                      Describe your issue
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="What went wrong with this session? Provide as much detail as possible..."
                      className="w-full h-32 bg-surface-2 border-2 border-border rounded-2xl p-4 text-sm outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all resize-none placeholder:text-text-muted"
                      maxLength={500}
                      disabled={loading}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-text-muted font-medium">
                        {reason.length}/500 characters
                      </p>
                      {reason.trim().length > 0 && reason.trim().length < 10 && (
                        <p className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Minimum 10 characters
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-error/10 text-error text-sm font-medium mb-6 border border-error/20"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  {/* Info Box */}
                  <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 mb-6">
                    <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                      <strong className="text-orange-500">Important:</strong> Disputes are reviewed by our admin team.
                      False or abusive dispute submissions may result in account restrictions.
                      We recommend contacting the mentor first to resolve any issues amicably.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      disabled={loading}
                      className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={loading || !reason.trim() || reason.trim().length < 10}
                      className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </span>
                      ) : (
                        'Submit Dispute'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
