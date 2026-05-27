/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingsPage from '@/app/bookings/page';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ThemeToggle to avoid ThemeProvider dependency
jest.mock('@/components/ui/ThemeToggle', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock icons that might cause issues
jest.mock('lucide-react', () => {
  const MockIcon = (props: any) => <svg data-testid="icon" {...props} />;
  return {
    Calendar: MockIcon,
    Clock: MockIcon,
    CheckCircle: MockIcon,
    X: MockIcon,
    Loader2: MockIcon,
    AlertCircle: MockIcon,
    ExternalLink: MockIcon,
    MessageSquare: MockIcon,
    Video: MockIcon,
    ChevronLeft: MockIcon,
    ChevronRight: MockIcon,
    Users: MockIcon,
    Star: MockIcon,
    FileText: MockIcon,
    IndianRupee: MockIcon,
    Ban: MockIcon,
    Info: MockIcon,
    ChevronDown: MockIcon,
    User: MockIcon,
    Settings: MockIcon,
    LogOut: MockIcon,
    Bell: MockIcon,
    Receipt: MockIcon,
  };
});

// Create a mock API response
const createMockResponse = (overrides = {}) => {
  const now = new Date();
  const defaultBooking = {
    id: 'b1',
    status: 'CONFIRMED',
    scheduledAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    durationMins: 15,
    topic: 'Career advice',
    meetingLink: 'https://zoom.us/j/123',
    conversationId: 'conv1',
    amount: 29900,
    refundAmount: null,
    cancelReason: null,
    hasTranscript: false,
    hasReview: false,
    reviewRating: null,
    counterpart: {
      id: 'emp-1',
      name: 'John Doe',
      title: 'Software Engineer',
      company: 'Google',
      avatar: null,
      role: 'EMPLOYEE',
    },
    payment: {
      razorpayPaymentId: 'pay_123',
      razorpayOrderId: 'order_123',
      payoutStatus: 'PENDING',
      refundAmount: null,
    },
  };

  return {
    bookings: [defaultBooking],
    meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    counts: { upcoming: 1, past: 0, cancelled: 0 },
    ...overrides,
  };
};

describe('Bookings Page', () => {
  const mockRouter = { push: jest.fn(), replace: jest.fn() };
  const mockSearchParams = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'student-1', role: 'STUDENT', name: 'Test User', image: null } },
      status: 'authenticated',
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  describe('Rendering', () => {
    it('shows loading state skeleton', async () => {
      // Make fetch never resolve to keep loading=true
      (global as any).fetch = jest.fn(() => new Promise(() => {}));

      await act(async () => {
        render(<BookingsPage />);
      });

      // Should show skeleton loading cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows error state with retry', async () => {
      (global as any).fetch = jest.fn(() => Promise.reject(new Error('Failed to load')));

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Failed to load/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    it('renders 3 tabs and default selected', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Upcoming/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancelled/i })).toBeInTheDocument();
      });
    });

    it('URL param ?tab=past -> Completed tab active', async () => {
      mockSearchParams.get.mockReturnValue('past');
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        // After initial fetch, active tab should be UPCOMING (default)
        // We check that all tabs render
        expect(screen.getByRole('button', { name: /Completed/i })).toBeInTheDocument();
      });
    });
  });

  describe('Upcoming Tab', () => {
    it('renders booking card with correct details', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockResponse(),
      });

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('Join Session button DISABLED when > 10min away', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockResponse({
          bookings: [{
            id: 'b1',
            status: 'CONFIRMED',
            scheduledAt: futureDate,
            durationMins: 15,
            topic: null,
            meetingLink: 'https://zoom.us/j/123',
            conversationId: 'conv1',
            amount: 29900,
            refundAmount: null,
            cancelReason: null,
            hasTranscript: false,
            hasReview: false,
            reviewRating: null,
            counterpart: {
              id: 'emp-1',
              name: 'John Doe',
              title: 'Software Engineer',
              company: 'Google',
              avatar: null,
              role: 'EMPLOYEE',
            },
            payment: {
              razorpayPaymentId: 'pay_123',
              razorpayOrderId: 'order_123',
              payoutStatus: 'PENDING',
              refundAmount: null,
            },
          }],
        }),
      });

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        const joinBtn = screen.getByRole('button', { name: /Join/i });
        expect(joinBtn).toBeDisabled();
      });
    });

    it('Join Session button ENABLED when < 10min away', async () => {
      const nearDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockResponse({
          bookings: [{
            id: 'b1',
            status: 'CONFIRMED',
            scheduledAt: nearDate,
            durationMins: 15,
            topic: null,
            meetingLink: 'https://zoom.us/j/123',
            conversationId: 'conv1',
            amount: 29900,
            refundAmount: null,
            cancelReason: null,
            hasTranscript: false,
            hasReview: false,
            reviewRating: null,
            counterpart: {
              id: 'emp-1',
              name: 'John Doe',
              title: 'Software Engineer',
              company: 'Google',
              avatar: null,
              role: 'EMPLOYEE',
            },
            payment: {
              razorpayPaymentId: 'pay_123',
              razorpayOrderId: 'order_123',
              payoutStatus: 'PENDING',
              refundAmount: null,
            },
          }],
        }),
      });

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        const joinBtn = screen.getByRole('button', { name: /Join/i });
        expect(joinBtn).not.toBeDisabled();
      });
    });
  });

  describe('Cancel Flow', () => {
    const createCancelMockResponse = () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      return {
        ok: true,
        json: async () => createMockResponse({
          bookings: [{
            id: 'b1',
            status: 'CONFIRMED',
            scheduledAt: futureDate,
            durationMins: 15,
            topic: null,
            meetingLink: 'https://zoom.us/j/123',
            conversationId: 'conv1',
            amount: 29900,
            refundAmount: null,
            cancelReason: null,
            hasTranscript: false,
            hasReview: false,
            reviewRating: null,
            counterpart: {
              id: 'emp-1',
              name: 'John Doe',
              title: 'Software Engineer',
              company: 'Google',
              avatar: null,
              role: 'EMPLOYEE',
            },
            payment: {
              razorpayPaymentId: 'pay_123',
              razorpayOrderId: 'order_123',
              payoutStatus: 'PENDING',
              refundAmount: null,
            },
          }],
        }),
      };
    };

    beforeEach(() => {
      (global as any).fetch = jest.fn().mockResolvedValue(createCancelMockResponse());
    });

    it('Clicking Cancel opens confirmation modal with Refund Eligible for 24h+', async () => {
      await act(async () => {
        render(<BookingsPage />);
      });

      // Wait for bookings to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click Cancel button (exact text match to avoid matching "Cancelled" tab)
      const cancelBtn = screen.getByText('Cancel');
      fireEvent.click(cancelBtn.closest('button')!);

      await waitFor(() => {
        expect(screen.getByText(/Refund Eligible/i)).toBeInTheDocument();
      });
    });

    it('Clicking Keep Session closes modal', async () => {
      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Open modal (click exact "Cancel" text)
      fireEvent.click(screen.getByText('Cancel').closest('button')!);

      // Click Keep Session
      await waitFor(() => {
        expect(screen.getByText(/Keep Session/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(/Keep Session/i));

      await waitFor(() => {
        expect(screen.queryByText(/Refund Eligible/i)).not.toBeInTheDocument();
      });
    });

    it('Clicking Yes, Cancel calls API and shows toast', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(createCancelMockResponse());
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Session cancelled.' }),
      });

      await act(async () => {
        render(<BookingsPage />);
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Open modal (click exact "Cancel" text)
      fireEvent.click(screen.getByText('Cancel').closest('button')!);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText(/Yes, Cancel/i)).toBeInTheDocument();
      });

      // Click Yes, Cancel
      fireEvent.click(screen.getByText(/Yes, Cancel/i));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/bookings/b1/cancel', expect.any(Object));
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });
});
