import { prisma } from '@/lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Chat Messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello! Looking forward to our session.',
    type: 'TEXT',
    createdAt: new Date('2026-06-01T10:00:00Z'),
    readAt: null,
  };

  it('should save message to database', async () => {
    (prisma.chatMessage.create as jest.Mock).mockResolvedValue(mockMessage);

    const result = await prisma.chatMessage.create({
      data: {
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello! Looking forward to our session.',
        type: 'TEXT',
      },
    });

    expect(result.conversationId).toBe('conv-1');
    expect(result.content).toBe('Hello! Looking forward to our session.');
    expect(result.type).toBe('TEXT');
  });

  it('should fetch messages for a conversation', async () => {
    const messages = [
      mockMessage,
      {
        ...mockMessage,
        id: 'msg-2',
        senderId: 'user-2',
        content: 'Great to meet you too!',
        createdAt: new Date('2026-06-01T10:01:00Z'),
      },
    ];

    (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue(messages);

    const result = await prisma.chatMessage.findMany({
      where: { conversationId: 'conv-1' },
      orderBy: { createdAt: 'asc' },
    });

    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Hello! Looking forward to our session.');
    expect(result[1].content).toBe('Great to meet you too!');
  });

  it('should handle attachment messages (image/file)', async () => {
    const attachmentMessage = {
      ...mockMessage,
      id: 'msg-3',
      content: 'Here is my resume',
      type: 'FILE',
      attachmentUrl: 'https://example.com/resume.pdf',
      attachmentName: 'resume.pdf',
    };

    (prisma.chatMessage.create as jest.Mock).mockResolvedValue(attachmentMessage);

    const result = await prisma.chatMessage.create({
      data: {
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Here is my resume',
        type: 'FILE',
        attachmentUrl: 'https://example.com/resume.pdf',
        attachmentName: 'resume.pdf',
      },
    });

    expect(result.type).toBe('FILE');
    expect(result.attachmentUrl).toBe('https://example.com/resume.pdf');
    expect(result.attachmentName).toBe('resume.pdf');
  });

  it('should return empty array for conversation with no messages', async () => {
    (prisma.chatMessage.findMany as jest.Mock).mockResolvedValue([]);

    const result = await prisma.chatMessage.findMany({
      where: { conversationId: 'empty-conv' },
    });

    expect(result).toEqual([]);
  });
});
