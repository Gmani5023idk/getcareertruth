import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

/**
 * Computes the next occurrence date for a recurring weekly slot.
 * Converts (dayOfWeek, timeStr) to the nearest future ISO datetime.
 */
function computeNextSlotDate(dayOfWeek: number, timeStr: string): string {
  const today = new Date();
  const currentDay = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil <= 0) daysUntil += 7; // Next week if today is same or past

  const [hours, minutes] = timeStr.split(':').map(Number);
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate.toISOString();
}

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
        mentorProfile: {
          include: { availabilitySlots: true },
        },
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

    // SEC: Check authentication to strip sensitive fields for unauthenticated users
    const session = await auth();
    const isAuthenticated = !!session?.user?.id;

    // Public fields: name, photo, college, domain, bio, rating
    // Sensitive fields: sessionRate, availabilitySlots, reviewsCount, email
    // Unauthenticated users see public profile only — pricing/availability
    // are competitor-harvestable and require a booking intent.
    const response: Record<string, unknown> = {
      id: mentor.id,
      name: mentor.studentProfile?.fullName || 'Anonymous',
      photo: profile?.photoUrl || mentor.profilePhoto,
      college: application.collegeName,
      domain: application.domain,
      bio: profile?.bio || application.bio,
      rating: profile?.rating || 0,
    };

    if (isAuthenticated) {
      // Authenticated users get full profile including pricing and availability
      response.sessionRate = application.sessionRate;
      response.availabilitySlots = (profile?.availabilitySlots || []).map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
        start: computeNextSlotDate(slot.dayOfWeek, slot.startTime),
        end: computeNextSlotDate(slot.dayOfWeek, slot.endTime),
      }));
      response.reviewsCount = profile?.reviewsCount || 0;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Fetch mentor profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
