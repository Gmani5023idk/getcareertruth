'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, MoreVertical, Phone, Video } from 'lucide-react';
import Button from '@/components/ui/Button';


export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  type?: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
}

interface ChatWindowProps {
  conversationId: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar: string;
    status?: 'online' | 'offline' | 'away';
  };
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
}

export function ChatWindow({
  conversationId,
  otherParticipant,
  messages,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
}: ChatWindowProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (messageInput.length > 0 && !isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    } else if (messageInput.length === 0 && isTyping) {
      setIsTyping(false);
      onTypingStop?.();
    }
  }, [messageInput, isTyping, onTypingStart, onTypingStop]);

  const handleSendMessage = () => {
    if (messageInput.trim() && !disabled) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
      setIsTyping(false);
      onTypingStop?.();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={otherParticipant.avatar}
              alt={otherParticipant.name}
              className="w-10 h-10 rounded-full"
            />
            {otherParticipant.status === 'online' && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-teal-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              {otherParticipant.name}
            </h3>
            <p className="text-xs text-slate-500">
              {otherParticipant.status === 'online'
                ? 'Online'
                : otherParticipant.status === 'away'
                ? 'Away'
                : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${
                  message.isOwn ? 'items-end' : 'items-start'
                } flex flex-col`}
              >
                {!message.isOwn && (
                  <p className="text-xs text-slate-500 mb-1">
                    {message.senderName}
                  </p>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    message.isOwn
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  {message.type === 'image' && message.attachmentUrl && (
                    <img
                      src={message.attachmentUrl}
                      alt="Attachment"
                      className="rounded-lg mb-2 max-w-full"
                    />
                  )}
                  {message.type === 'file' && message.attachmentUrl && (
                    <div className="flex items-center gap-2 mb-2">
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">{message.attachmentName}</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={disabled}>
            <Paperclip className="w-5 h-5" />
          </Button>
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={disabled}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || disabled}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
