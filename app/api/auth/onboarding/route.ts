import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = await req.json();

  if (!['STUDENT', 'EMPLOYEE'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { role },
    });

    return NextResponse.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Onboarding update error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
