import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * Send a message
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        content,
        type,
        attachmentUrl,
        attachmentName,
      },
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

    // TODO: Trigger Pusher event
    // try {
    //   await pusherServer.trigger(`conversation-${conversationId}`, 'new-message', message);
    // } catch (e) { console.error('Pusher error:', e); }

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        data: message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

/**
 * Get messages for a conversation
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = session.user.id;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          include: {
            studentProfile: { select: { fullName: true } },
            employeeProfile: { select: { fullName: true } },
            parentProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      skip: offset,
    });

    // Format messages
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.studentProfile?.fullName || 
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
      { messages: formattedMessages },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get messages' },
      { status: 500 }
    );
  }
}
