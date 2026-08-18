/**
 * Integration tests: Transcript Download Authorization
 * =====================================================
 *
 * Verifies that GET /api/transcripts/[id]/download properly gates access:
 *   - Unauthenticated → 401
 *   - Admin → allowed
 *   - Booking owner (student/parent) → allowed
 *   - Employee (mentor) → allowed
 *   - Unrelated user → 403 Forbidden
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
let mockSession: Record<string, unknown> | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock PDF-lib with complete page object
vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: vi.fn().mockReturnValue({ width: 600, height: 800 }),
    drawText: vi.fn(),
    drawRectangle: vi.fn(),
    drawLine: vi.fn(),
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setFontColor: vi.fn(),
  };
  const mockDoc = {
    addPage: vi.fn().mockReturnValue(mockPage),
    embedFont: vi.fn().mockResolvedValue({}),
    save: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])), // %PDF header bytes
  };
  return {
    PDFDocument: { create: vi.fn().mockResolvedValue(mockDoc) },
    rgb: vi.fn(() => ({ r: 0, g: 0, b: 0 })),
    StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' },
  };
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MockTranscript {
  id: string;
  content: string;
  summary: string | null;
  keyPoints: string[] | null;
  booking: {
    studentId: string | null;
    parentId: string | null;
    employeeId: string;
    scheduledAt: Date;
    topic: string | null;
    student: { email: string } | null;
    parent: { email: string } | null;
    employee: {
      employeeProfile: { fullName: string; company: string } | null;
    };
  };
}

function makeTranscript(overrides: Partial<MockTranscript> = {}): MockTranscript {
  return {
    id: 'transcript-1',
    content: 'Full transcript content here...',
    summary: 'Key discussion points',
    keyPoints: ['Point 1', 'Point 2'],
    booking: {
      studentId: 'student-1',
      parentId: null,
      employeeId: 'employee-1',
      scheduledAt: new Date('2025-06-01'),
      topic: 'Career in tech',
      student: { email: 'student@test.com' },
      parent: null,
      employee: { employeeProfile: { fullName: 'Test Mentor', company: 'Test Corp' } },
    },
    ...overrides,
  };
}

const mockTranscriptFindUnique = vi.fn();
vi.mock('@/lib/db', () => ({
  prisma: {
    transcript: {
      findUnique: mockTranscriptFindUnique,
    },
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
const { GET: GET_TranscriptDownload } = await import(
  '@/app/api/transcripts/[id]/download/route'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockRequest(method: string, url: string): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000');
  return {
    method,
    url: urlObj.toString(),
    nextUrl: { searchParams: urlObj.searchParams, pathname: urlObj.pathname },
    headers: new Headers(),
    json: async () => ({}),
  } as unknown as NextRequest;
}

async function expectAuthStatus(
  scenario: string,
  session: Record<string, unknown> | null,
  transcript: MockTranscript | null,
  expectedStatus: number,
) {
  mockSession = session;
  mockTranscriptFindUnique.mockResolvedValue(transcript);

  const req = mockRequest(
    'GET',
    `/api/transcripts/${transcript?.id ?? 'x'}/download`,
  );

  // We don't need the mockNextResponse here — the route returns a NextResponse
  // with either JSON error or PDF buffer
  const response = await GET_TranscriptDownload(req, {
    params: Promise.resolve({ id: transcript?.id ?? 'x' }),
  });

  expect(response.status, `[${scenario}] Expected status ${expectedStatus}`).toBe(
    expectedStatus,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/transcripts/[id]/download — Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = null;
  });

  describe('Authentication gate', () => {
    it('returns 401 when unauthenticated', async () => {
      mockTranscriptFindUnique.mockResolvedValue(makeTranscript());
      const req = mockRequest('GET', '/api/transcripts/transcript-1/download');
      const response = await GET_TranscriptDownload(req, {
        params: Promise.resolve({ id: 'transcript-1' }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Authorization — allowed users', () => {
    it('allows ADMIN to download any transcript', async () => {
      const transcript = makeTranscript({
        booking: { ...makeTranscript().booking, studentId: 'other-user' },
      });
      await expectAuthStatus(
        'admin',
        { user: { id: 'admin-1', role: 'ADMIN' } },
        transcript,
        200,
      );
    });

    it('allows the student (booking owner) to download', async () => {
      await expectAuthStatus(
        'student owner',
        { user: { id: 'student-1', role: 'STUDENT' } },
        makeTranscript(),
        200,
      );
    });

    it('allows the parent (booking owner) to download', async () => {
      const transcript = makeTranscript({
        booking: {
          ...makeTranscript().booking,
          studentId: null,
          parentId: 'parent-1',
        },
      });
      await expectAuthStatus(
        'parent owner',
        { user: { id: 'parent-1', role: 'PARENT' } },
        transcript,
        200,
      );
    });

    it('allows the employee (mentor) to download', async () => {
      await expectAuthStatus(
        'employee',
        { user: { id: 'employee-1', role: 'EMPLOYEE' } },
        makeTranscript(),
        200,
      );
    });
  });

  describe('Authorization — denied users', () => {
    it('returns 403 when an unrelated student tries to download', async () => {
      await expectAuthStatus(
        'unrelated student',
        { user: { id: 'other-student', role: 'STUDENT' } },
        makeTranscript(),
        403,
      );
    });

    it('returns 403 when an unrelated employee tries to download', async () => {
      await expectAuthStatus(
        'unrelated employee',
        { user: { id: 'other-employee', role: 'EMPLOYEE' } },
        makeTranscript(),
        403,
      );
    });
  });

  describe('Edge cases', () => {
    it('returns 404 when transcript does not exist', async () => {
      mockSession = { user: { id: 'admin-1', role: 'ADMIN' } };
      mockTranscriptFindUnique.mockResolvedValue(null);
      const req = mockRequest('GET', '/api/transcripts/nonexistent/download');
      const response = await GET_TranscriptDownload(req, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      expect(response.status).toBe(404);
    });

    it('returns binary PDF data on success', async () => {
      mockSession = { user: { id: 'admin-1', role: 'ADMIN' } };
      mockTranscriptFindUnique.mockResolvedValue(makeTranscript());
      const req = mockRequest(
        'GET',
        '/api/transcripts/transcript-1/download',
      );
      const response = await GET_TranscriptDownload(req, {
        params: Promise.resolve({ id: 'transcript-1' }),
      });
      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });
});
