import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const profileSchema = z.object({
  photoUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().optional(),
  availabilitySlots: z.array(z.object({
    start: z.string().datetime(), // ISO 8601
    end: z.string().datetime(),
  })).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has an APPROVED application
    const application = await prisma.mentorApplication.findFirst({
      where: {
        userId: session.user.id,
        status: 'APPROVED',
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Only approved mentors can update profile' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = profileSchema.parse(body);

    // Validate availabilitySlots: no overlapping time ranges
    if (validatedData.availabilitySlots) {
      const slots = validatedData.availabilitySlots;
      for (let i = 0; i < slots.length; i++) {
        const current = slots[i];
        if (new Date(current.start) >= new Date(current.end)) {
          return NextResponse.json({ error: 'Slot start time must be before end time' }, { status: 400 });
        }
        for (let j = i + 1; j < slots.length; j++) {
          const next = slots[j];
          if (
            (new Date(current.start) < new Date(next.end)) &&
            (new Date(current.end) > new Date(next.start))
          ) {
            return NextResponse.json({ error: 'Time slots cannot overlap' }, { status: 400 });
          }
        }
      }
    }

    const updatedProfile = await prisma.mentorProfile.update({
      where: { userId: session.user.id },
      data: {
        photoUrl: validatedData.photoUrl,
        bio: validatedData.bio,
        availabilitySlots: validatedData.availabilitySlots as any,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
    }
    console.error('Update mentor profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
