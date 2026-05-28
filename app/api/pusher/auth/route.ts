import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Pusher from 'pusher';

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

/**
 * POST /api/pusher/auth
 *
 * Authenticates a user to a private/presence Pusher channel.
 * NextAuth session provides the user identity.
 *
 * Security: for private-conversation-* channels, we verify the authenticated
 * user is actually a participant in that conversation.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const socketId = formData.get('socket_id') as string;
  const channel = formData.get('channel_name') as string;

  if (!socketId || !channel) {
    return NextResponse.json({ error: 'socket_id and channel_name are required' }, { status: 400 });
  }

  // ── Authorization per channel type ─────────────────────────────────

  // Private conversation channel: verify user is a participant
  if (channel.startsWith('private-conversation-')) {
    const conversationId = channel.replace('private-conversation-', '');
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });

    if (!participants.length) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const isParticipant = participants.some(p => p.userId === session.user.id);
    if (!isParticipant) {
      console.warn(
        `[Pusher auth] User ${session.user.id} attempted to join conversation ${conversationId} without being a participant.`
      );
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Presence channel: verify user is a legitimate platform member
  if (channel.startsWith('presence-')) {
    // Any authenticated user can join presence channels
    // Extend this block if you need additional presence channel authorization
  }

  // Authorize the channel
  const authResponse = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}