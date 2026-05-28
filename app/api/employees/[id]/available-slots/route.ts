import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params;
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start'); // YYYY-MM-DD
    const endParam = searchParams.get('end'); // YYYY-MM-DD

    // Default to today and next 13 days (14 total)
    const today = new Date();
    const startDate = startParam
      ? new Date(startParam + 'T00:00:00')
      : new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = endParam
      ? new Date(endParam + 'T00:00:00')
      : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 13);

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    // Fetch employee profile (must exist)
    const employeeProfile = await prisma.employeeProfile.findUnique({
      where: { userId: employeeId },
      select: { id: true },
    });

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Fix 1: Fetch availability slots from the relational table instead of JSON
    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: { employeeProfileId: employeeProfile.id },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    });

    // Map availability by day name (0=Sunday, 1=Monday, ..., 6=Saturday)
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slotsByDay = new Map<string, string[]>();
    for (const slot of availabilitySlots) {
      const dayName = DAY_NAMES[slot.dayOfWeek];
      if (!slotsByDay.has(dayName)) {
        slotsByDay.set(dayName, []);
      }
      slotsByDay.get(dayName)!.push(slot.startTime);
    }

    // Generate dates from startDate to endDate inclusive
    const dates: string[] = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dates.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
    }

    // Fetch existing bookings for the employee within the extended range (status not cancelled)
    const bookings = await prisma.booking.findMany({
      where: {
        employeeId,
        scheduledAt: {
          gte: new Date(startDate.getTime() - 6 * 60 * 60 * 1000), // include previous 6h to catch overlaps from previous day
          lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000), // up to end of last day
        },
        status: { notIn: ['CANCELLED', 'REFUNDED', 'EXPIRED'] },
      },
      select: { scheduledAt: true },
    });

    // Create a set of booked date+time keys (YYYY-MM-DDTHH:MM) in Asia/Kolkata
    // Convert each scheduledAt to Asia/Kolkata date and time
    const bookedKeys = new Set<string>();
    for (const b of bookings) {
      const date = b.scheduledAt.toLocaleDateString('en-CA'); // YYYY-MM-DD (server local? but we want Asia/Kolkata)
      // Better: convert to Asia/Kolkata using Intl
      const dateKolkata = new Date(b.scheduledAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const dateStr = dateKolkata.toISOString().split('T')[0];
      const timeStr = dateKolkata.toTimeString().slice(0, 5);
      bookedKeys.add(`${dateStr}T${timeStr}`);
    }

    const freeSlots: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      startDateTime: string;
      durationMins: number;
    }[] = [];

    for (const dateStr of dates) {
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });
      const daySlots = slotsByDay.get(dayName);
      if (!daySlots || daySlots.length === 0) continue;

      for (const timeStr of daySlots) {
        // Construct start datetime in Asia/Kolkata offset
        const startDateTime = new Date(`${dateStr}T${timeStr}:00+05:30`);
        const key = `${dateStr}T${timeStr}`;
        if (!bookedKeys.has(key)) {
          // Assume 30 min duration
          const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);
          const endTimeStr = endDateTime.toTimeString().slice(0, 5);
          freeSlots.push({
            id: `${employeeId}-${dateStr}-${timeStr}`,
            date: dateStr,
            startTime: timeStr,
            endTime: endTimeStr,
            startDateTime: startDateTime.toISOString(),
            durationMins: 30,
          });
        }
      }
    }

    // Sort by startDateTime
    freeSlots.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

    return NextResponse.json({ slots: freeSlots });
  } catch (error) {
    console.error('Get available slots error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch available slots' },
      { status: 500 }
    );
  }
}
