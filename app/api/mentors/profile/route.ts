import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { slotSchema, normaliseSlot, validateSlots } from '@/shared/schemas/availability-slot.schema';

const profileSchema = z.object({
  photoUrl: z.string().url().optional().or(z.literal('')),
  bio: z.string().optional(),
  availabilitySlots: z.array(slotSchema).optional(),
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
      const normalised = validatedData.availabilitySlots.map((slot: any) => normaliseSlot(slot));
      const error = validateSlots(normalised);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
    }

    // Fetch mentor profile ID once upfront for availability slot operations
    const mentorProfile = await prisma.mentorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const updateData: Record<string, unknown> = {
      photoUrl: validatedData.photoUrl,
      bio: validatedData.bio,
    };

    // If availability slots provided, replace them all at once
    if (validatedData.availabilitySlots && mentorProfile) {
      // Delete all existing availability slots for this mentor
      await prisma.availabilitySlot.deleteMany({
        where: { mentorProfileId: mentorProfile.id },
      });

      // Create new availability slots from the provided data (handle both formats)
      await prisma.availabilitySlot.createMany({
        data: validatedData.availabilitySlots.map((slot: any) => ({
          mentorProfileId: mentorProfile.id,
          dayOfWeek: 'start' in slot ? new Date(slot.start).getDay() : slot.dayOfWeek,
          startTime: 'start' in slot ? new Date(slot.start).toISOString().slice(11, 16) : slot.startTime,
          endTime: 'start' in slot ? new Date(slot.end).toISOString().slice(11, 16) : slot.endTime,
          timezone: slot.timezone || 'Asia/Kolkata',
        })),
      });
    }

    const updatedProfile = await prisma.mentorProfile.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update mentor profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
