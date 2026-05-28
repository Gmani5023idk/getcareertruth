'use client';

import { useState } from 'react';
import { ChatWindow, ChatMessage } from '@/components/chat/chat-window';
import ConversationList, { Conversation } from '@/components/chat/conversation-list';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { CheckCircle, Bell, MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    otherParticipant: {
      id: '2',
      name: 'Priya Patel',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
      status: 'online',
    },
    lastMessage: {
      content: 'Thanks for the advice!',
      timestamp: new Date(),
      isOwn: false,
    },
    unreadCount: 1,
    type: 'student',
    updatedAt: new Date(),
  },
];

export default function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | null>('1');

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col">
      <nav className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight">GetCareer<span className="text-primary">Truth</span></span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" alt="User" />
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
          <div className="lg:col-span-1 h-full overflow-hidden flex flex-col">
            <h1 className="text-xl font-display font-bold mb-4">Messages</h1>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <ConversationList
                userId="1" // This should come from auth session in a real app
                type="student"
                selectedConversationId={selectedId || undefined}
                onSelectConversation={(conv) => setSelectedId(conv.id)}
              />
            </div>
          </div>

          <div className="lg:col-span-2 h-full overflow-hidden">
            <div className="h-full bg-surface border border-border rounded-2xl overflow-hidden glass">
              <ChatWindow
                conversationId={selectedId || ''}
                otherParticipant={mockConversations[0].otherParticipant}
                messages={[]}
                onSendMessage={() => {}}
                onTypingStart={() => {}}
                onTypingStop={() => {}}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
