'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Phone, Video, Search, Info } from 'lucide-react';
import ConversationList from '@/components/chat/conversation-list';
import MessageBubble from '@/components/chat/message-bubble';
import MessageInput from '@/components/chat/message-input';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
}

interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar: string;
  };
  lastMessage: {
    content: string;
    timestamp: Date;
    isOwn: boolean;
  } | null;
  unreadCount: number;
  type: 'student' | 'parent' | 'employee';
  updatedAt: Date;
}

interface ChatPageProps {
  userId: string;
  type?: 'student' | 'parent' | 'employee';
}

export default function ChatPage({ userId, type = 'student' }: ChatPageProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/chat/messages?conversationId=${selectedConversation.id}&userId=${userId}`
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, attachment?: { url: string; name: string }) => {
    if (!selectedConversation) return;

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          senderId: userId,
          content,
          type: attachment ? (attachment.url.startsWith('data:image') ? 'image' : 'file') : 'text',
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
        }),
      });

      const data = await response.json();

      if (data.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.data.id,
            senderId: data.data.senderId,
            senderName: data.data.sender.user.name,
            senderAvatar: data.data.sender.user.avatar || '',
            content: data.data.content,
            timestamp: new Date(data.data.createdAt),
            isOwn: true,
            type: data.data.type,
            attachmentUrl: data.data.attachmentUrl,
            attachmentName: data.data.attachmentName,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowConversationList(false);
  };

  const handleBack = () => {
    setShowConversationList(true);
    setSelectedConversation(null);
  };

  return (
    <div className="flex h-screen bg-surface">
      {/* Conversation List Sidebar */}
      {showConversationList && (
        <div className="w-full md:w-96 border-r border-border">
          <ConversationList
            userId={userId}
            type={type}
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={handleSelectConversation}
          />
        </div>
      )}

      {/* Chat Area */}
      {!showConversationList && selectedConversation && (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-surface">
            <div className="flex items-center gap-3">
              {/* Back Button (Mobile) */}
              <button
                onClick={handleBack}
                className="md:hidden p-2 hover:bg-surface-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-text-primary" />
              </button>

              {/* Avatar */}
              {selectedConversation.otherParticipant.avatar ? (
                <img
                  src={selectedConversation.otherParticipant.avatar}
                  alt={selectedConversation.otherParticipant.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                  {selectedConversation.otherParticipant.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}

              {/* Name */}
              <div className="flex-1">
                <h2 className="font-semibold text-text-primary">
                  {selectedConversation.otherParticipant.name}
                </h2>
                <p className="text-sm text-text-muted">
                  {type === 'student' ? 'Student' : type === 'parent' ? 'Parent' : 'Employee'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-text-muted" />
                </button>
                <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
                  <Video className="w-5 h-5 text-text-muted" />
                </button>
                <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
                  <Search className="w-5 h-5 text-text-muted" />
                </button>
                <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
                  <Info className="w-5 h-5 text-text-muted" />
                </button>
                <button className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-surface-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="text-text-secondary text-sm">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    content={message.content}
                    timestamp={message.timestamp}
                    isOwn={message.isOwn}
                    senderName={message.senderName}
                    senderAvatar={message.senderAvatar}
                    type={message.type}
                    attachmentUrl={message.attachmentUrl}
                    attachmentName={message.attachmentName}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            placeholder={`Message ${selectedConversation.otherParticipant.name}...`}
          />
        </div>
      )}

      {/* Empty State */}
      {!showConversationList && !selectedConversation && (
        <div className="flex-1 flex items-center justify-center bg-surface-2">
          <div className="text-center">
            <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">
              Select a conversation to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
