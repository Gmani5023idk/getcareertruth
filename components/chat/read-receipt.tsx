'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadReceiptProps {
  status: 'sent' | 'delivered' | 'read';
  timestamp?: Date;
}

export default function ReadReceipt({ status, timestamp }: ReadReceiptProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const icons = {
    sent: <Check className="w-4 h-4 text-text-muted" />,
    delivered: <CheckCheck className="w-4 h-4 text-text-muted" />,
    read: <CheckCheck className="w-4 h-4 text-verified" />,
  };

  return (
    <div className="flex items-center gap-1">
      {icons[status]}
      {timestamp && (
        <span className="text-xs text-text-muted">
          {formatTime(timestamp)}
        </span>
      )}
    </div>
  );
}
