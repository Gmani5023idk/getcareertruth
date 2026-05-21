'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';

/**
 * Client-side Pusher hook for real-time features
 */

interface UsePusherOptions {
  channelName: string;
  eventName: string;
  onMessage: (data: any) => void;
}

export function usePusher({ channelName, eventName, onMessage }: UsePusherOptions) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Pusher client
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(channelName);

    channel.bind(eventName, (data: any) => {
      onMessage(data);
    });

    pusher.connection.bind('connected', () => {
      setIsConnected(true);
    });

    pusher.connection.bind('disconnected', () => {
      setIsConnected(false);
    });

    return () => {
      channel.unbind(eventName);
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [channelName, eventName, onMessage]);

  return { isConnected };
}

/**
 * Hook for real-time chat messages
 */
export function useChatMessages(conversationId: string, onNewMessage: (message: any) => void) {
  return usePusher({
    channelName: `conversation-${conversationId}`,
    eventName: 'new-message',
    onMessage: onNewMessage,
  });
}

/**
 * Hook for typing indicators
 */
export function useTypingIndicator(
  conversationId: string,
  onTypingChange: (data: { userId: string; userName: string; isTyping: boolean }) => void
) {
  return usePusher({
    channelName: `conversation-${conversationId}`,
    eventName: 'typing',
    onMessage: onTypingChange,
  });
}

/**
 * Hook for message read receipts
 */
export function useMessageRead(
  conversationId: string,
  onMessageRead: (data: { messageId: string; userId: string }) => void
) {
  return usePusher({
    channelName: `conversation-${conversationId}`,
    eventName: 'message-read',
    onMessage: onMessageRead,
  });
}

/**
 * Hook for conversation updates
 */
export function useConversationUpdates(
  conversationId: string,
  onUpdate: (data: any) => void
) {
  return usePusher({
    channelName: `conversation-${conversationId}`,
    eventName: 'conversation-update',
    onMessage: onUpdate,
  });
}

/**
 * Hook for user presence
 */
export function useUserPresence(userId: string, onPresenceChange: (data: { userId: string; online: boolean }) => void) {
  return usePusher({
    channelName: `user-${userId}`,
    eventName: 'presence',
    onMessage: onPresenceChange,
  });
}

/**
 * Hook to send typing indicator
 */
export function useTypingSender(conversationId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendTyping = useCallback(async (typing: boolean) => {
    setIsTyping(typing);

    try {
      const response = await fetch('/api/chat/typing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          isTyping: typing,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send typing indicator');
      }
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    sendTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 3000);
  }, [sendTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTyping(false);
  }, [sendTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isTyping, startTyping, stopTyping };
}
