import { validateUser } from './auth';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

jest.mock('./db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('validateUser', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'STUDENT',
    studentProfile: { fullName: 'Test Student' },
    employeeProfile: null,
    parentProfile: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when credentials are valid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await validateUser('test@example.com', 'password123');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      include: {
        studentProfile: true,
        employeeProfile: true,
        parentProfile: true,
      },
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(result).toEqual(mockUser);
  });

  it('should throw USER_NOT_FOUND if user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(validateUser('notfound@example.com', 'password')).rejects.toThrow('USER_NOT_FOUND');
  });

  it('should throw SOCIAL_AUTH_ONLY if user has no passwordHash', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, passwordHash: null });

    await expect(validateUser('test@example.com', 'password')).rejects.toThrow('SOCIAL_AUTH_ONLY');
  });

  it('should throw INVALID_PASSWORD if password does not match', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(validateUser('test@example.com', 'wrongpassword')).rejects.toThrow('INVALID_PASSWORD');
  });
});
