import Pusher from 'pusher';

/**
 * Pusher configuration for real-time features
 */

// Initialize Pusher server instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

/**
 * Trigger an event to a channel
 */
export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown
) {
  try {
    await pusher.trigger(channel, event, data);
    return { success: true };
  } catch (error) {
    console.error('Pusher trigger error:', error);
    return { success: false, error };
  }
}

/**
 * Trigger a new message event
 */
export async function triggerNewMessage(
  conversationId: string,
  message: unknown
) {
  return triggerEvent(`conversation-${conversationId}`, 'new-message', message);
}

/**
 * Trigger a typing indicator event
 */
export async function triggerTyping(
  conversationId: string,
  userId: string,
  userName: string,
  isTyping: boolean
) {
  return triggerEvent(`conversation-${conversationId}`, 'typing', {
    userId,
    userName,
    isTyping,
  });
}

/**
 * Trigger a message read event
 */
export async function triggerMessageRead(
  conversationId: string,
  messageId: string,
  userId: string
) {
  return triggerEvent(`conversation-${conversationId}`, 'message-read', {
    messageId,
    userId,
  });
}

/**
 * Trigger a conversation update event
 */
export async function triggerConversationUpdate(
  conversationId: string,
  data: unknown
) {
  return triggerEvent(`conversation-${conversationId}`, 'conversation-update', data);
}

/**
 * Trigger a user presence event
 */
export async function triggerUserPresence(
  userId: string,
  online: boolean
) {
  return triggerEvent(`user-${userId}`, 'presence', {
    userId,
    online,
  });
}
