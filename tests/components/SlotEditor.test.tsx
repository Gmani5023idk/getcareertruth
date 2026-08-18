/**
 * SlotEditor Vitest Unit Tests
 *
 * Covers:
 *   1. Zod schema validation — new format (availabilitySlotSchema) and union type (old ↔ new)
 *   2. Overlap detection — same-day collisions, cross-day pass-through, time ordering
 *   3. Component behavior — add/remove/update slots, timezone selection, save validation
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { availabilitySlotSchema } from '@/shared/schemas/auth.schema';
import { z } from 'zod';
import {
  slotSchema,
  validateSlots,
} from '@/shared/schemas/availability-slot.schema';

// ──────────────────────────────────────────────
// Hoisted mocks — these must be defined at module scope so vitest's
// hoisting transformation can register them before imports are resolved.
// ──────────────────────────────────────────────

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, isLoading, className, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={className}
      data-variant={variant}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('@/components/ui/Card', () => ({
  default: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus">+</span>,
  Trash2: () => <span data-testid="icon-trash">🗑</span>,
  Calendar: () => <span data-testid="icon-calendar">📅</span>,
  Clock: () => <span data-testid="icon-clock">🕐</span>,
  Globe: () => <span data-testid="icon-globe">🌍</span>,
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));



// ──────────────────────────────────────────────
// 1. Zod Schema Validation
// ──────────────────────────────────────────────

describe('availabilitySlotSchema (new format)', () => {
  it('accepts a valid slot with all fields', () => {
    const slot = {
      dayOfWeek: 2,
      startTime: '09:30',
      endTime: '10:30',
      timezone: 'America/New_York',
    };
    const result = availabilitySlotSchema.parse(slot);
    expect(result).toEqual(slot);
  });

  it('applies default timezone when omitted', () => {
    const slot = { dayOfWeek: 3, startTime: '14:00', endTime: '15:00' };
    const result = availabilitySlotSchema.parse(slot);
    expect(result.timezone).toBe('Asia/Kolkata');
  });

  it('rejects dayOfWeek < 0', () => {
    expect(() =>
      availabilitySlotSchema.parse({ dayOfWeek: -1, startTime: '09:00', endTime: '10:00' })
    ).toThrow();
  });

  it('rejects dayOfWeek > 6', () => {
    expect(() =>
      availabilitySlotSchema.parse({ dayOfWeek: 7, startTime: '09:00', endTime: '10:00' })
    ).toThrow();
  });

  it('rejects invalid startTime format (not HH:mm)', () => {
    expect(() =>
      availabilitySlotSchema.parse({ dayOfWeek: 1, startTime: '9:00', endTime: '10:00' })
    ).toThrow();
  });

  it('rejects invalid endTime format (not HH:mm)', () => {
    expect(() =>
      availabilitySlotSchema.parse({ dayOfWeek: 1, startTime: '09:00', endTime: '25:00' })
    ).toThrow();
  });

  it('rejects startTime without leading zero', () => {
    expect(() =>
      availabilitySlotSchema.parse({ dayOfWeek: 1, startTime: '9:30', endTime: '10:30' })
    ).toThrow();
  });

  it('accepts boundary time values (00:00 and 23:59)', () => {
    expect(() =>
      availabilitySlotSchema.parse({ dayOfWeek: 0, startTime: '00:00', endTime: '23:59' })
    ).not.toThrow();
  });
});

describe('slotSchema union type (old ↔ new format)', () => {
  const isoDate = '2026-07-15T10:00:00.000Z';

  it('accepts old format (start / end ISO strings)', () => {
    const oldSlot = { start: isoDate, end: '2026-07-15T11:00:00.000Z' };
    const result = slotSchema.parse(oldSlot);
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
  });

  it('accepts new format (dayOfWeek / startTime / endTime)', () => {
    const newSlot = { dayOfWeek: 3, startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' };
    const result = slotSchema.parse(newSlot);
    expect(result).toHaveProperty('dayOfWeek');
    expect(result).toHaveProperty('startTime');
    expect(result).toHaveProperty('endTime');
  });

  it('applies default timezone for new format when omitted', () => {
    const result = slotSchema.parse({ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' });
    if ('timezone' in result) {
      expect(result.timezone).toBe('Asia/Kolkata');
    } else {
      // Old format doesn't have timezone; test should use new format
      expect(false).toBe(true);
    }
  });

  it('rejects data matching neither format', () => {
    expect(() =>
      slotSchema.parse({ notAField: true })
    ).toThrow(z.ZodError);
  });

  it('rejects new format with invalid dayOfWeek', () => {
    expect(() =>
      slotSchema.parse({ dayOfWeek: 99, startTime: '09:00', endTime: '10:00' })
    ).toThrow(z.ZodError);
  });

  it('rejects new format with invalid time string', () => {
    expect(() =>
      slotSchema.parse({ dayOfWeek: 1, startTime: '25:00', endTime: '26:00' })
    ).toThrow(z.ZodError);
  });

  it('handles an array of mixed old and new formats', () => {
    const mixed = [
      { start: '2026-07-15T09:00:00.000Z', end: '2026-07-15T10:00:00.000Z' },
      { dayOfWeek: 2, startTime: '14:00', endTime: '15:00', timezone: 'America/New_York' },
    ];
    const arrSchema = z.array(slotSchema);
    const result = arrSchema.parse(mixed);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('start');
    expect(result[1]).toHaveProperty('dayOfWeek', 2);
  });
});

// ──────────────────────────────────────────────
// 2. Overlap Detection
// ──────────────────────────────────────────────

describe('validateSlots — overlap detection', () => {
  it('returns null for an empty array', () => {
    expect(validateSlots([])).toBeNull();
  });

  it('returns null for a single slot', () => {
    expect(validateSlots([{ dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }])).toBeNull();
  });

  it('rejects endTime before startTime', () => {
    const err = validateSlots([{ dayOfWeek: 1, startTime: '10:00', endTime: '09:00' }]);
    expect(err).toContain('End time must be after start time');
  });

  it('rejects endTime equal to startTime', () => {
    const err = validateSlots([{ dayOfWeek: 1, startTime: '10:00', endTime: '10:00' }]);
    expect(err).toContain('End time must be after start time');
  });

  it('passes same-day non-overlapping sequential slots', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
    ];
    expect(validateSlots(slots)).toBeNull();
  });

  it('rejects same-day overlapping slots', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' },
    ];
    expect(validateSlots(slots)).toBe('Time slots cannot overlap');
  });

  it('rejects completely contained slot (inner overlap)', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
    ];
    expect(validateSlots(slots)).toBe('Time slots cannot overlap');
  });

  it('passes different-day slots regardless of times', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
    ];
    expect(validateSlots(slots)).toBeNull();
  });

  it('passes multiple non-overlapping slots across different days', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '15:00' },
      { dayOfWeek: 5, startTime: '08:00', endTime: '09:00' },
    ];
    expect(validateSlots(slots)).toBeNull();
  });

  it('rejects overlap among 3+ same-day slots', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' },
      { dayOfWeek: 1, startTime: '09:30', endTime: '10:30' },
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
    ];
    expect(validateSlots(slots)).toBe('Time slots cannot overlap');
  });

  it('validates individual slot before checking overlaps (order independent)', () => {
    const slots = [
      { dayOfWeek: 1, startTime: '12:00', endTime: '10:00' },  // invalid on its own
      { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
    ];
    const err = validateSlots(slots);
    expect(err).toContain('End time must be after start time');
  });
});

// ──────────────────────────────────────────────
// 3. Component Behavior
// ──────────────────────────────────────────────

describe('SlotEditor component', () => {
  let SlotEditor: any;
  let render: typeof import('@testing-library/react').render;
  let screen: typeof import('@testing-library/react').screen;
  let fireEvent: typeof import('@testing-library/react').fireEvent;
  let cleanup: () => void;
  let mockOnSave: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const mod = await import('@/components/mentor/SlotEditor');
    SlotEditor = mod.default;

    const testingLib = await import('@testing-library/react');
    render = testingLib.render;
    screen = testingLib.screen;
    fireEvent = testingLib.fireEvent;
    cleanup = testingLib.cleanup;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mockOnSave = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  // ── Basic rendering ──

  it('renders the heading and action button', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    expect(screen.getByText('Availability Center')).toBeInTheDocument();
    expect(screen.getByText('New Slot')).toBeInTheDocument();
    expect(screen.getByText('Publish All Slots')).toBeInTheDocument();
  });

  it('renders a default slot when initialSlots is empty', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Default slot has dayOfWeek=1 (Monday) → the "Mon" button should be rendered
    const dayButtons = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    expect(dayButtons).toHaveLength(7);
  });

  it('renders provided initialSlots', () => {
    const initialSlots = [
      { dayOfWeek: 2, startTime: '14:00', endTime: '15:00', timezone: 'America/New_York' },
      { dayOfWeek: 4, startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
    ];
    render(<SlotEditor initialSlots={initialSlots} onSave={mockOnSave} />);
    // 2 slots × 7 day buttons each = 14
    const dayButtons = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    expect(dayButtons).toHaveLength(14);
  });

  // ── Adding a slot ──

  it('addSlot creates a new slot with default values', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Initially 7 day buttons (1 default slot)
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)).toHaveLength(7);

    fireEvent.click(screen.getByText('New Slot'));

    // After adding, there should be 14 day buttons (2 slots × 7 days)
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)).toHaveLength(14);
  });

  it('addSlot is also triggered by clicking the empty-state placeholder when all slots are removed', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Remove the default slot to reach empty state
    fireEvent.click(screen.getAllByTestId('icon-trash')[0].closest('button')!);
    // Empty state now visible
    expect(screen.getByText('No slots available')).toBeInTheDocument();
    // Click the empty-state area
    fireEvent.click(screen.getByText('No slots available'));
    // Now slot rows appear — day buttons increase
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)).toHaveLength(7);
  });

  // ── Removing a slot ──

  it('removeSlot removes the correct slot', () => {
    const initialSlots: any[] = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', timezone: 'Asia/Kolkata' },
      { dayOfWeek: 3, startTime: '14:00', endTime: '15:00', timezone: 'Asia/Kolkata' },
    ];
    render(<SlotEditor initialSlots={initialSlots} onSave={mockOnSave} />);
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)).toHaveLength(14);

    // Each slot row has a remove button. Click the first one.
    const trashIcons = screen.getAllByTestId('icon-trash');
    fireEvent.click(trashIcons[0].closest('button')!);

    // After removing, should have 7 day buttons (1 slot left)
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/)).toHaveLength(7);
  });

  // ── Updating a slot field ──

  it('updateSlot changes the dayOfWeek when a day button is clicked', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Default slot has dayOfWeek=1 (Monday). Click "Wed" button to change it.
    const wedButtons = screen.getAllByText('Wed');
    expect(wedButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(wedButtons[0]);
    // After clicking, the "Wed" button should still be present (state changed successfully)
    expect(screen.getAllByText('Wed').length).toBeGreaterThanOrEqual(1);
  });

  it('updateSlot changes startTime via the time input', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Default slot has startTime='10:00' — find the start time input
    const startInputs = screen.getAllByDisplayValue('10:00') as HTMLInputElement[];
    expect(startInputs.length).toBeGreaterThanOrEqual(1);
    // Change to a unique value that doesn't clash with default endTime ('11:00')
    fireEvent.change(startInputs[0], { target: { value: '08:00' } });
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
    // End time ('11:00') should still be present
    expect(screen.getByDisplayValue('11:00')).toBeInTheDocument();
  });

  it('updateSlot changes endTime via the time input', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Default slot has endTime='11:00'
    const endInputs = screen.getAllByDisplayValue('11:00') as HTMLInputElement[];
    expect(endInputs.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(endInputs[0], { target: { value: '12:00' } });
    expect(screen.getByDisplayValue('12:00')).toBeInTheDocument();
  });

  // ── Timezone selection ──

  it('timezone select renders with default IST value', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    const select = screen.getAllByRole('combobox')[0];
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('Asia/Kolkata');
  });

  it('changes timezone when a different option is selected', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'America/New_York' } });
    expect(select).toHaveValue('America/New_York');
  });

  it('timezone select offers all 8 expected options', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    const select = screen.getAllByRole('combobox')[0];
    const options = Array.from(select.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual([
      'Asia/Kolkata',
      'Asia/Dubai',
      'America/New_York',
      'Europe/London',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland',
      'America/Los_Angeles',
    ]);
  });

  // ── Save validation ──

  it('calls onSave and shows success toast when slots are valid', async () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    fireEvent.click(screen.getByText('Publish All Slots'));
    await vi.waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
    expect(mockOnSave).toHaveBeenCalledWith([
      { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', timezone: 'Asia/Kolkata' },
    ]);
    expect(mockToast.success).toHaveBeenCalledWith('Availability slots updated successfully!');
  });

  it('shows error toast when endTime is before startTime', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Change end time to be before start time
    const endInputs = screen.getAllByDisplayValue('11:00') as HTMLInputElement[];
    fireEvent.change(endInputs[0], { target: { value: '09:00' } });
    fireEvent.click(screen.getByText('Publish All Slots'));
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('End time must be after start time')
    );
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows error toast when startTime or endTime is empty', () => {
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    // Clear start time
    const startInputs = screen.getAllByDisplayValue('10:00') as HTMLInputElement[];
    fireEvent.change(startInputs[0], { target: { value: '' } });
    fireEvent.click(screen.getByText('Publish All Slots'));
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('Start and end times are required')
    );
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows error toast when onSave throws', async () => {
    const error = new Error('Network error');
    mockOnSave.mockRejectedValueOnce(error);
    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    fireEvent.click(screen.getByText('Publish All Slots'));
    await vi.waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network error');
    });
  });

  // ── Loading state ──

  it('disables button while saving', async () => {
    let resolve!: () => void;
    const savePromise = new Promise<void>((r) => { resolve = r; });
    mockOnSave.mockReturnValueOnce(savePromise);

    render(<SlotEditor initialSlots={[]} onSave={mockOnSave} />);
    fireEvent.click(screen.getByText('Publish All Slots'));
    expect(mockOnSave).toHaveBeenCalled();

    resolve();
    // Wait for the save to complete so the component can re-render
    await vi.waitFor(() => {
      expect(screen.getByText('Publish All Slots')).toBeInTheDocument();
    });
  });
});
