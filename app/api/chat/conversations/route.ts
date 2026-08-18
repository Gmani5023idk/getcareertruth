type ConversationType = 'STUDENT_STUDENT' | 'PARENT_PARENT' | 'STUDENT_EMPLOYEE' | 'PARENT_EMPLOYEE';

const VALID_CONVERSATION_TYPES: ConversationType[] = ['STUDENT_STUDENT', 'PARENT_PARENT', 'STUDENT_EMPLOYEE', 'PARENT_EMPLOYEE'];

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * Get all conversations for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const userId = session.user.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        ...(type && (VALID_CONVERSATION_TYPES as string[]).includes(type)
          ? { type: type as ConversationType }
          : {}),
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              include: {
                studentProfile: { select: { fullName: true } },
                employeeProfile: { select: { fullName: true } },
                parentProfile: { select: { fullName: true } },
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format conversations
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== userId
      );
      const otherUser = otherParticipant?.user;
      
      const name = otherUser?.studentProfile?.fullName || 
                   otherUser?.employeeProfile?.fullName || 
                   otherUser?.parentProfile?.fullName || 
                   otherUser?.email || 'Unknown';

      const lastMessage = conv.messages[0];

      return {
        id: conv.id,
        otherParticipant: {
          id: otherParticipant?.userId || '',
          name,
          avatar: otherUser?.profilePhoto || null,
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              timestamp: lastMessage.createdAt,
              isOwn: lastMessage.senderId === userId,
            }
          : null,
        unreadCount: 0, // In a real app, track read status
        type: conv.type,
        updatedAt: conv.updatedAt,
      };
    });

    return NextResponse.json(
      { conversations: formattedConversations },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get conversations error:', error);
    const message = error instanceof Error ? (error as Error).message : 'Failed to get conversations';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Create a new conversation (typically called during booking confirmation)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { participantId, type } = body;
    const userId = session.user.id;

    if (!participantId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: participantId } } }
        ]
      },
    });

    if (existingConversation) {
      return NextResponse.json(
        {
          message: 'Conversation already exists',
          conversation: existingConversation,
        },
        { status: 200 }
      );
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        type,
        participants: {
          create: [
            { userId },
            { userId: participantId },
          ],
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Conversation created successfully',
        conversation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create conversation error:', error);
    const message = error instanceof Error ? (error as Error).message : 'Failed to create conversation';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
