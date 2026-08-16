/**
 * Employee Dashboard — Unit Tests
 *
 * Covers: loading, pending request rendering, approve/cancel with
 * confirm dialog, optimistic UI (immediate removal, revert on failure).
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock setup ──

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) =>
    React.createElement('a', { href, className, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    span: ({ children, ...p }: any) => <span {...p}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => {
  const NullIcon = () => null;
  return {
    Calendar: NullIcon, Clock: NullIcon, Star: NullIcon,
    TrendingUp: NullIcon, DollarSign: NullIcon, Users: NullIcon,
    ChevronRight: NullIcon, CheckCircle: NullIcon, Bell: NullIcon,
    LogOut: NullIcon, Settings: NullIcon, ShieldCheck: NullIcon,
    CreditCard: NullIcon, Loader2: () => <span data-testid="icon-loader">loading</span>,
    ExternalLink: NullIcon, MessageSquare: NullIcon, AlertCircle: NullIcon,
    Menu: NullIcon, X: NullIcon, LayoutDashboard: NullIcon, Wallet: NullIcon,
  };
});

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, className, ...p }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...p}>{children}</button>
  ),
}));

vi.mock('@/components/ui/Card', () => ({
  default: ({ children, ...p }: any) => <div data-testid="card" {...p}>{children}</div>,
}));

vi.mock('@/components/ui/ThemeToggle', () => ({
  default: () => null,
}));

vi.mock('@/components/transcript/transcript-list', () => ({
  default: () => null,
}));

// ── Test helpers ──

const mkPending = (overrides: Record<string, any> = {}) => ({
  id: 'pending-001',
  topic: 'Software Engineering Career Path',
  scheduledAt: '2026-07-15T10:00:00.000Z',
  status: 'PENDING_CONFIRM',
  student: { id: 'stu-001', studentProfile: { fullName: 'Amit Student' } },
  ...overrides,
});

const mkApiResponse = (data: any) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data),
});

// ── Tests ──

describe('Employee Dashboard', () => {
  let Page: React.ComponentType;
  let useSession: any;
  const mockFetch = vi.fn();

  beforeAll(async () => {
    vi.stubGlobal('fetch', mockFetch);
    Page = (await import('@/app/(dashboard)/employee/page')).default;
    useSession = (await import('next-auth/react')).useSession;
  });

  beforeEach(async () => {
    mockFetch.mockReset();
    // Always get the latest useSession reference — vitest module cache can change
    // when other test files mock the same module in the same worker.
    const authModule = await import('next-auth/react');
    useSession = authModule.useSession;
    useSession.mockReturnValue({
      data: { user: { id: 'e1', role: 'EMPLOYEE', name: 'Expert', image: null } },
      status: 'authenticated',
    });
    window.confirm = vi.fn(() => true) as any;
  });

  afterEach(() => {
    cleanup();
  });

  // ── Loading ──
  it('shows spinner while fetching data', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<Page />);
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });

  // ── Empty pending ──
  it('shows empty state when no pending requests', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } })) // profile
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] })) // upcoming
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] })) // pending
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] })); // completed

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Awaiting new engagements.')).toBeInTheDocument();
    });
  });

  // ── Pending request rendering ──
  it('renders pending requests with student name and topic', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } })) // profile
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] })) // upcoming
      .mockResolvedValueOnce(mkApiResponse({ bookings: [mkPending()] })) // pending
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] })); // completed

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Amit Student')).toBeInTheDocument();
    });
    expect(screen.getByText('Software Engineering Career Path')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  // ── Approve API ──
  it('calls approve API on Deploy click', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [mkPending()] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // approve API

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Deploy')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deploy'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/bookings/pending-001/approve',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  // ── Cancel API ──
  it('calls cancel API on Reject click', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [mkPending()] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // cancel API

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reject'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/bookings/pending-001/cancel',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  // ── Optimistic UI: removes pending immediately on approve ──
  it('removes pending card immediately on Deploy click (optimistic)', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [mkPending()] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockReturnValue(new Promise(() => {})); // approve API never resolves

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Amit Student')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deploy'));

    await waitFor(() => {
      expect(screen.queryByText('Amit Student')).not.toBeInTheDocument();
    });
  });

  // ── Optimistic UI: reverts on approve API failure ──
  it('reverts optimistic removal on approve API failure', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [mkPending({ id: 'p1' })] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockRejectedValueOnce(new Error('Network error')); // approve API fails

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Amit Student')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Deploy'));

    await waitFor(() => {
      expect(screen.getByText('Amit Student')).toBeInTheDocument();
    });
  });

  // ── Optimistic UI: reverts on reject API failure ──
  it('reverts optimistic removal on reject API failure', async () => {
    mockFetch
      .mockResolvedValueOnce(mkApiResponse({ employee: { totalEarned: 0, totalCalls: 0, rating: 0, pricePerCall: 0 } }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [mkPending({ id: 'p2' })] }))
      .mockResolvedValueOnce(mkApiResponse({ bookings: [] }))
      .mockRejectedValueOnce(new Error('Server error')); // cancel API fails

    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Amit Student')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reject'));

    await waitFor(() => {
      expect(screen.getByText('Amit Student')).toBeInTheDocument();
    });
  });
});
