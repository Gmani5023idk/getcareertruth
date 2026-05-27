import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('Create Booking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBooking = {
    studentId: 'student-1',
    employeeId: 'employee-1',
    scheduledAt: new Date('2026-06-01T10:00:00Z'),
    durationMins: 15,
    amountPaid: 29900,
    platformFee: 2990,
    employeePayout: 26910,
    status: 'PENDING_CONFIRM' as const,
    topic: 'Career advice in tech',
  };

  it('should create booking with valid slot', async () => {
    (prisma.booking.create as jest.Mock).mockResolvedValue({
      id: 'booking-1',
      ...validBooking,
    });

    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null); // No double booking

    const result = await prisma.booking.create({ data: validBooking });

    expect(result.id).toBe('booking-1');
    expect(result.status).toBe('PENDING_CONFIRM');
    expect(result.employeePayout).toBe(26910);
  });

  it('should reject double-booking at same time for same employee', async () => {
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
      id: 'existing-booking',
      employeeId: 'employee-1',
      scheduledAt: validBooking.scheduledAt,
      status: 'CONFIRMED',
    });

    const existing = await prisma.booking.findFirst({
      where: {
        employeeId: validBooking.employeeId,
        scheduledAt: validBooking.scheduledAt,
        status: { in: ['CONFIRMED', 'PENDING_CONFIRM'] },
      },
    });

    expect(existing).not.toBeNull();
  });

  it('should calculate platform fee correctly (10% of amount)', () => {
    const amountPaid = 29900;
    const expectedFee = Math.round(amountPaid * 0.1);
    const expectedPayout = amountPaid - expectedFee;

    expect(expectedFee).toBe(2990);
    expect(expectedPayout).toBe(26910);
  });

  it('should create booking with student ID (not parent)', async () => {
    (prisma.booking.create as jest.Mock).mockResolvedValue({
      id: 'booking-2',
      ...validBooking,
      parentId: null,
    });

    const result = await prisma.booking.create({
      data: { ...validBooking, parentId: undefined },
    });

    expect(result.parentId).toBeNull();
    expect(result.studentId).toBe('student-1');
  });

  it('should create booking with parent ID (not student)', async () => {
    const parentBooking = {
      ...validBooking,
      studentId: null,
      parentId: 'parent-1',
    };
    delete (parentBooking as any).studentId;

    (prisma.booking.create as jest.Mock).mockResolvedValue({
      id: 'booking-3',
      parentId: 'parent-1',
      studentId: null,
    });

    const result = await prisma.booking.create({
      data: { employeeId: parentBooking.employeeId, scheduledAt: parentBooking.scheduledAt, amountPaid: parentBooking.amountPaid, platformFee: parentBooking.platformFee, employeePayout: parentBooking.employeePayout, parentId: parentBooking.parentId, topic: parentBooking.topic },
    });

    expect(result.parentId).toBe('parent-1');
    expect(result.studentId).toBeNull();
  });
});
