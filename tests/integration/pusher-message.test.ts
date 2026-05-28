/**
 * Integration tests: Pusher Broadcast on Message Send
 * =====================================================
 *
 * Covers:
 *   - POST /api/chat/messages — message creation and Pusher trigger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockRequest(method: string, url: string, body?: unknown): NextRequest {
  const urlObj = new URL(url, 'http://localhost:3000');
  return {
    method,
    url: urlObj.toString(),
    nextUrl: { searchParams: urlObj.searchParams, pathname: urlObj.pathname },
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  } as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'user-1', role: 'STUDENT' } }),
}));

const mockMessageCreate = vi.fn().mockResolvedValue({
  id: 'msg-1',
  content: 'Hello',
  senderId: 'user-1',
  conversationId: 'conv-1',
  createdAt: new Date(),
  type: 'TEXT',
  attachmentUrl: null,
  attachmentName: null,
  sender: {
    id: 'user-1',
    email: 'student@test.com',
    studentProfile: { fullName: 'Test Student' },
    employeeProfile: null,
    parentProfile: null,
    profilePhoto: null,
  },
});
const mockConversationFindFirst = vi.fn().mockResolvedValue({
  id: 'conv-1',
  employeeId: 'emp-1',
  studentId: 'user-1',
  mentorProfile: null,
  parentId: null,
});

vi.mock('@/lib/db', () => ({
  prisma: {
    conversationParticipant: {
      findUnique: vi.fn().mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
      }),
    },
    chatMessage: {
      create: mockMessageCreate,
    },
    conversation: {
      findFirst: mockConversationFindFirst,
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

const mockPusherTrigger = vi.fn().mockResolvedValue({});

vi.mock('@/lib/pusher-server', () => ({
  pusher: {
    trigger: mockPusherTrigger,
  },
}));

vi.mock('@/lib/pusher-client', () => ({}));

const { POST: POST_Message } = await import('@/app/api/chat/messages/route');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/chat/messages — Message with Pusher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a message and returns success', async () => {
    const req = mockRequest('POST', '/api/chat/messages', {
      conversationId: 'conv-1',
      content: 'Hello',
    });

    const response = await POST_Message(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toBe('Message sent successfully');
  });
});
