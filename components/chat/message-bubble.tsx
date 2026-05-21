'use client';

import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  content: string;
  timestamp: Date;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  type?: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
}

export default function MessageBubble({
  content,
  timestamp,
  isOwn,
  senderName,
  senderAvatar,
  type = 'text',
  attachmentUrl,
  attachmentName,
}: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className={cn(
        'flex gap-3 mb-4',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isOwn && senderAvatar && (
        <div className="flex-shrink-0">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
              {senderName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Message */}
      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name */}
        {!isOwn && senderName && (
          <span className="text-xs text-text-muted mb-1 ml-1">
            {senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isOwn
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-surface text-text-primary rounded-bl-sm'
          )}
        >
          {/* Text Content */}
          {type === 'text' && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {content}
            </p>
          )}

          {/* Image Attachment */}
          {type === 'image' && attachmentUrl && (
            <div className="space-y-2">
              <img
                src={attachmentUrl}
                alt={attachmentName}
                className="rounded-lg max-w-full h-auto"
              />
              {content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {content}
                </p>
              )}
            </div>
          )}

          {/* File Attachment */}
          {type === 'file' && attachmentUrl && (
            <div className="space-y-2">
              <a
                href={attachmentUrl}
                download={attachmentName}
                className="flex items-center gap-2 p-2 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachmentName}
                  </p>
                </div>
              </a>
              {content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {content}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            'text-xs text-text-muted mt-1',
            isOwn ? 'mr-1' : 'ml-1'
          )}
        >
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
}
