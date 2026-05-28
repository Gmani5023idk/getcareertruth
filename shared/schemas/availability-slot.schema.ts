import { z } from 'zod';

/**
 * Old format: ISO datetime strings (legacy from the original JSON `availabilitySlots`).
 * Kept for backward compatibility during the transition.
 */
export const oldSlotSchema = z.object({
  start: z.string().datetime(), // ISO 8601
  end: z.string().datetime(),
});

/**
 * New format: recurring weekly slots matching the AvailabilitySlot DB model.
 * `dayOfWeek` uses JS convention: 0=Sunday, 1=Monday, ..., 6=Saturday.
 * `timezone` defaults to Asia/Kolkata if omitted.
 */
export const newSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm in 24h format'),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm in 24h format'),
  timezone: z.string().default('Asia/Kolkata'),
});

/**
 * Union type that accepts either the old (start/end) or new (dayOfWeek/startTime/endTime) format.
 * Used by API routes that receive slot data from both the legacy frontend and the updated SlotEditor.
 */
export const slotSchema = z.union([oldSlotSchema, newSlotSchema]);

/**
 * In-memory slot representation after normalisation — always in new-format shape.
 */
export interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Converts a slot from either format into the canonical Slot interface.
 */
export function normaliseSlot(raw: Record<string, unknown>): Slot {
  if ('start' in raw && typeof raw.start === 'string') {
    return {
      dayOfWeek: new Date(raw.start).getDay(),
      startTime: new Date(raw.start).toISOString().slice(11, 16),
      endTime: new Date(raw.end as string).toISOString().slice(11, 16),
    };
  }
  return {
    dayOfWeek: raw.dayOfWeek as number,
    startTime: raw.startTime as string,
    endTime: raw.endTime as string,
  };
}

/**
 * Validate an array of slots for business rules:
 *   - Each slot must have endTime > startTime
 *   - No two slots on the same day may overlap
 * Returns null if valid, or an error message string if invalid.
 */
export function validateSlots(slots: Slot[]): string | null {
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.startTime >= slot.endTime) {
      return `Slot ${i + 1}: End time must be after start time`;
    }
    for (let j = i + 1; j < slots.length; j++) {
      const other = slots[j];
      if (slot.dayOfWeek === other.dayOfWeek) {
        if (slot.startTime < other.endTime && slot.endTime > other.startTime) {
          return 'Time slots cannot overlap';
        }
      }
    }
  }
  return null;
}
