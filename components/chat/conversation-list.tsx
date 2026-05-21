'use client';

import { useState, useEffect } from 'react';
import { Search, MoreVertical, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Conversation {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    avatar: string;
    status?: string;
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

interface ConversationListProps {
  userId: string;
  type?: 'student' | 'parent' | 'employee';
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
}

export default function ConversationList({
  userId,
  type = 'student',
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [userId, type]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(
        `/api/chat/conversations?userId=${userId}&type=${type}`
      );
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherParticipant.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'Just now' : `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-surface-2">
        <div className="p-4 border-b border-border">
          <div className="h-10 bg-surface-3 rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-surface rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-2">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-text-primary mb-3">
          {type === 'student' ? 'Students' : type === 'parent' ? 'Parents' : 'Chats'}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-secondary text-sm">
              {searchQuery
                ? 'No conversations found'
                : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  'w-full p-4 flex items-center gap-3 hover:bg-surface-3 transition-colors',
                  selectedConversationId === conversation.id && 'bg-surface-3'
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conversation.otherParticipant.avatar ? (
                    <img
                      src={conversation.otherParticipant.avatar}
                      alt={conversation.otherParticipant.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-lg">
                      {conversation.otherParticipant.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                  )}
                  {conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-text-primary truncate">
                      {conversation.otherParticipant.name}
                    </h3>
                    <span className="text-xs text-text-muted flex-shrink-0 ml-2">
                      {conversation.lastMessage
                        ? formatTime(conversation.lastMessage.timestamp)
                        : ''}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary truncate">
                    {conversation.lastMessage
                      ? conversation.lastMessage.content
                      : 'No messages yet'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle call
                    }}
                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                  >
                    <Phone className="w-4 h-4 text-text-muted" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle video call
                    }}
                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                  >
                    <Video className="w-4 h-4 text-text-muted" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle more options
                    }}
                    className="p-2 hover:bg-surface rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
