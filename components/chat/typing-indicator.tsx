'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
}

export default function TypingIndicator({ isTyping, userName }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-text-muted">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {userName ? `${userName} is typing` : 'Someone is typing'}
      </span>
    </div>
  );
}
