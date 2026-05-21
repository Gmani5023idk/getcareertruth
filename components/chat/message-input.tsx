'use client';

import { useState, useRef } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string, attachment?: { url: string; name: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || attachment) {
      onSendMessage(message.trim(), attachment || undefined);
      setMessage('');
      setAttachment(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production, upload to Cloudinary or similar
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          url: reader.result as string,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileType = (fileName: string): 'image' | 'file' => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    return imageExtensions.includes(ext) ? 'image' : 'file';
  };

  return (
    <div className="p-4 bg-surface border-t border-border">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-3 p-3 bg-surface-2 rounded-xl flex items-center gap-3">
          {getFileType(attachment.name) === 'image' ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
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
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {attachment.name}
            </p>
          </div>
          <button
            onClick={removeAttachment}
            className="p-2 hover:bg-surface-3 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={cn(
            'p-3 rounded-xl transition-colors',
            'bg-surface-2 hover:bg-surface-3 text-text-muted',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className={cn(
              'w-full px-4 py-3 bg-surface-2 rounded-xl text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'resize-none',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'min-h-[48px] max-h-[120px]'
            )}
            style={{
              height: 'auto',
              minHeight: '48px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
        </div>

        {/* Emoji Button */}
        <button
          disabled={disabled}
          className={cn(
            'p-3 rounded-xl transition-colors',
            'bg-surface-2 hover:bg-surface-3 text-text-muted',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && !attachment)}
          className={cn(
            'p-3 rounded-xl transition-colors',
            'bg-primary text-white hover:bg-primary-hover',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-text-muted mt-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}
