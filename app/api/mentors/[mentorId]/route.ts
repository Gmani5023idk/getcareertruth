import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mentorId: string }> }
) {
  try {
    const { mentorId } = await params;

    const mentor = await prisma.user.findUnique({
      where: { id: mentorId },
      select: {
        id: true,
        email: true,
        profilePhoto: true, 
        studentProfile: {
          select: {
            fullName: true,
            collegeName: true,
          },
        },
        mentorProfile: true,
        mentorApplications: {
          where: { status: 'APPROVED' },
          select: {
            collegeName: true,
            domain: true,
            bio: true,
            sessionRate: true,
          },
          take: 1,
        },
      },
    });

    if (!mentor || mentor.mentorApplications.length === 0) {
      return NextResponse.json({ error: 'Mentor not found or not approved' }, { status: 404 });
    }

    const application = mentor.mentorApplications[0];
    const profile = mentor.mentorProfile;

    return NextResponse.json({
      id: mentor.id,
      name: mentor.studentProfile?.fullName || 'Anonymous',
      photo: profile?.photoUrl || mentor.profilePhoto,
      college: application.collegeName,
      domain: application.domain,
      bio: profile?.bio || application.bio,
      sessionRate: application.sessionRate,
      availabilitySlots: profile?.availabilitySlots || [],
      rating: profile?.rating || 0,
      reviewsCount: profile?.reviewsCount || 0,
    });
  } catch (error: any) {
    console.error('Fetch mentor profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
