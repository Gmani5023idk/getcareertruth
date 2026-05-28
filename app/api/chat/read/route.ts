import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
// import { triggerMessageRead } from '@/lib/pusher-server';

/**
 * Mark message as read
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messageId } = body;
    const userId = session.user.id;

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId' },
        { status: 400 }
      );
    }

    // Get message details
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Update message read status
    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        readAt: new Date(),
      },
    });

    // TODO: Trigger message read event via Pusher
    // try {
    //   await triggerMessageRead(message.conversationId, messageId, userId);
    // } catch (e) { console.error('Pusher error:', e); }

    return NextResponse.json(
      {
        message: 'Message marked as read successfully',
        data: updatedMessage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mark message as read error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to mark message as read' },
      { status: 500 }
    );
  }
}
