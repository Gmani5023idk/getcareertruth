import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Accept both old (start/end ISO datetime) and new (dayOfWeek/startTime/endTime) slot formats
const oldSlotSchema = z.object({
  start: z.string().datetime(), // ISO 8601
  end: z.string().datetime(),
});

const newSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm in 24h format'),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm in 24h format'),
  timezone: z.string().default('Asia/Kolkata'),
});

const slotSchema = z.union([oldSlotSchema, newSlotSchema]);

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
      const slots = validatedData.availabilitySlots;
      
      // Normalise all slots to the new format for validation
      const normalised = slots.map((slot: any) => {
        if ('start' in slot) {
          // Old format: extract dayOfWeek and times
          return {
            dayOfWeek: new Date(slot.start).getDay(),
            startTime: new Date(slot.start).toISOString().slice(11, 16),
            endTime: new Date(slot.end).toISOString().slice(11, 16),
            timezone: 'Asia/Kolkata',
          };
        }
        return slot;
      });

      for (let i = 0; i < normalised.length; i++) {
        const slot = normalised[i];
        if (slot.startTime >= slot.endTime) {
          return NextResponse.json({ error: 'Slot end time must be after start time' }, { status: 400 });
        }
        for (let j = i + 1; j < normalised.length; j++) {
          const other = normalised[j];
          // Only check overlap if on the same day
          if (slot.dayOfWeek === other.dayOfWeek) {
            if (slot.startTime < other.endTime && slot.endTime > other.startTime) {
              return NextResponse.json({ error: 'Time slots cannot overlap' }, { status: 400 });
            }
          }
        }
      }
    }

    // Fetch mentor profile ID once upfront for availability slot operations
    const mentorProfile = await prisma.mentorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const updateData: any = {
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
    }
    console.error('Update mentor profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
