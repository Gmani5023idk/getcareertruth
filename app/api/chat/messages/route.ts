import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { pusher } from '@/lib/pusher-server';

/**
 * Send a message (POST) and broadcast via Pusher.
 * Retrieve messages with pagination (GET).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, content, type = 'TEXT', attachmentUrl, attachmentName } = body;
    const senderId = session.user.id;

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: { conversationId, senderId, content, type, attachmentUrl, attachmentName },
      include: {
        sender: {
          include: {
            studentProfile: { select: { fullName: true } },
            employeeProfile: { select: { fullName: true } },
            parentProfile: { select: { fullName: true } },
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // ── Broadcast new message via Pusher ──────────────────────────
    const senderName =
      message.sender.studentProfile?.fullName ||
      message.sender.employeeProfile?.fullName ||
      message.sender.parentProfile?.fullName ||
      message.sender.email ||
      'User';

    await pusher
      .trigger(`private-conversation-${conversationId}`, 'new-message', {
        id: message.id,
        text: message.content,
        senderId: message.senderId,
        senderName,
        conversationId,
        createdAt: message.createdAt,
        type: message.type,
        attachmentUrl: message.attachmentUrl,
        attachmentName: message.attachmentName,
      })
      .catch((pusherErr) => {
        // Non-fatal — message is already persisted
        console.error('[Pusher] new-message trigger failed:', pusherErr);
      });

    return NextResponse.json(
      { message: 'Message sent successfully', data: message },
      { status: 201 }
    );
  } catch (error) {
    console.error('Send message error:', error);
    // Never leak implementation details
    return NextResponse.json(
      { error: 'Message could not be sent. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Get messages for a conversation (with offset pagination).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const userId = session.user.id;

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const [messages, total] = await prisma.$transaction([
      prisma.chatMessage.findMany({
        where: { conversationId },
        include: {
          sender: {
            include: {
              studentProfile: { select: { fullName: true } },
              employeeProfile: { select: { fullName: true } },
              parentProfile: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.chatMessage.count({ where: { conversationId } }),
    ]);

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName:
        msg.sender.studentProfile?.fullName ||
        msg.sender.employeeProfile?.fullName ||
        msg.sender.parentProfile?.fullName ||
        msg.sender.email,
      senderAvatar: msg.sender.profilePhoto || '',
      content: msg.content,
      timestamp: msg.createdAt,
      isOwn: msg.senderId === userId,
      type: msg.type,
      attachmentUrl: msg.attachmentUrl,
      attachmentName: msg.attachmentName,
    }));

    return NextResponse.json(
      {
        messages: formattedMessages,
        pagination: {
          limit,
          offset,
          total,
          hasNextPage: offset + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Messages could not be loaded. Please try again.' },
      { status: 500 }
    );
  }
}
