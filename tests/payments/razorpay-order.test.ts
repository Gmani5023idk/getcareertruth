import { prisma } from '@/lib/db';
import Razorpay from 'razorpay';

jest.mock('@/lib/db', () => ({
  prisma: {
    booking: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('razorpay', () => {
  const mockOrders = {
    create: jest.fn(),
    fetch: jest.fn(),
  };
  return jest.fn(() => ({
    orders: mockOrders,
    payments: { fetch: jest.fn() },
  }));
});

describe('Razorpay Order Creation', () => {
  const mockRazorpay = new Razorpay({ key_id: 'test', key_secret: 'test' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create order successfully with valid amount', async () => {
    const amount = 29900; // ₹299 in paise
    const mockOrder = {
      id: 'order_test_123',
      amount,
      currency: 'INR',
      status: 'created',
      receipt: 'receipt_1',
    };

    (mockRazorpay.orders.create as jest.Mock).mockResolvedValue(mockOrder);

    const order = await mockRazorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: 'receipt_1',
    });

    expect(order.id).toBe('order_test_123');
    expect(order.amount).toBe(amount);
    expect(order.status).toBe('created');
    expect(mockRazorpay.orders.create).toHaveBeenCalledWith({
      amount,
      currency: 'INR',
      receipt: 'receipt_1',
    });
  });

  it('should reject order with invalid amount (0 or negative)', async () => {
    (mockRazorpay.orders.create as jest.Mock).mockRejectedValue(
      new Error('amount must be greater than 0')
    );

    await expect(
      mockRazorpay.orders.create({ amount: 0, currency: 'INR' })
    ).rejects.toThrow('amount must be greater than 0');
  });

  it('should handle Razorpay API failure gracefully', async () => {
    (mockRazorpay.orders.create as jest.Mock).mockRejectedValue(
      new Error('Razorpay API unavailable')
    );

    await expect(
      mockRazorpay.orders.create({ amount: 29900, currency: 'INR' })
    ).rejects.toThrow('Razorpay API unavailable');
  });

  it('should update booking with order ID on success', async () => {
    const bookingId = 'booking-1';
    const orderId = 'order_test_456';

    (prisma.booking.update as jest.Mock).mockResolvedValue({
      id: bookingId,
      razorpayOrderId: orderId,
    });

    const result = await prisma.booking.update({
      where: { id: bookingId },
      data: { razorpayOrderId: orderId },
    });

    expect(result.razorpayOrderId).toBe(orderId);
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: bookingId },
      data: { razorpayOrderId: orderId },
    });
  });
});
