import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
// import { triggerTyping } from '@/lib/pusher-server';

/**
 * Send typing indicator
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, isTyping } = body;
    const userId = session.user.id;

    if (!conversationId || typeof isTyping !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: { select: { fullName: true } },
        employeeProfile: { select: { fullName: true } },
        parentProfile: { select: { fullName: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const name = user.studentProfile?.fullName || 
                 user.employeeProfile?.fullName || 
                 user.parentProfile?.fullName || 
                 user.email;

    // TODO: Trigger typing event via Pusher
    // try {
    //   await triggerTyping(conversationId, userId, name, isTyping);
    // } catch (e) { console.error('Pusher error:', e); }

    return NextResponse.json(
      {
        message: 'Typing indicator sent successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Send typing indicator error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send typing indicator' },
      { status: 500 }
    );
  }
}
