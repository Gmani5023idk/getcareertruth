import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const sort = searchParams.get('sort'); // 'rating'

    const mentors = await prisma.user.findMany({
      where: {
        mentorApplications: {
          some: {
            status: 'APPROVED',
            ...(domain ? { domain: { contains: domain, mode: 'insensitive' } } : {}),
          },
        },
      },
      select: {
        id: true,
        profilePhoto: true,
        studentProfile: {
          select: {
            fullName: true,
          },
        },
        mentorProfile: true,
        mentorApplications: {
          where: { status: 'APPROVED' },
          select: {
            collegeName: true,
            domain: true,
            sessionRate: true,
          },
        },
      },
    });

    // Map to public format
    let formattedMentors = mentors.map(m => {
      const app = m.mentorApplications[0];
      const prof = m.mentorProfile;
      return {
        id: m.id,
        name: m.studentProfile?.fullName || 'Anonymous',
        photo: prof?.photoUrl || m.profilePhoto,
        college: app.collegeName,
        domain: app.domain,
        sessionRate: app.sessionRate,
        rating: prof?.rating || 0,
        reviewsCount: prof?.reviewsCount || 0,
      };
    });

    // Sorting
    if (sort === 'rating') {
      formattedMentors.sort((a, b) => b.rating - a.rating);
    }

    return NextResponse.json(formattedMentors);
  } catch (error: any) {
    console.error('Fetch mentors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
