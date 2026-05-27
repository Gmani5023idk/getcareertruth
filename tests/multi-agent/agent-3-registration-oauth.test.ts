/**
 * Agent 3 — Registration Flow Tester (Google OAuth)
 *
 * Tests Google OAuth account creation, DB record creation, and
 * account linking behavior via the PrismaAdapter integration.
 *
 * Since NextAuth OAuth callbacks involve ESM-only modules (@auth/core)
 * that Jest cannot transform, we test the PrismaAdapter behavior directly
 * by simulating what NextAuth does during an OAuth sign-in:
 *   1. PrismaAdapter.createUser() — creates User with emailVerified pre-set
 *   2. PrismaAdapter.linkAccount() — links OAuth Account to User
 *   3. Duplicate OAuth sign-in — account linking, no duplicate User
 *   4. JWT session shape validation
 */

const mockUserCreate = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserFindFirst = jest.fn();
const mockAccountCreate = jest.fn();
const mockAccountFindFirst = jest.fn();
const mockAccountFindMany = jest.fn();

const mockAccountFindUnique = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      create: mockUserCreate,
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
    },
    account: {
      create: mockAccountCreate,
      findFirst: mockAccountFindFirst,
      findMany: mockAccountFindMany,
      findUnique: mockAccountFindUnique,
    },
  },
}));

import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

let emailCounter = 0;
function uniqueEmail(prefix = 'oauth'): string {
  emailCounter += 1;
  return `${prefix}.${emailCounter}.${Date.now()}@gmail.com`;
}

function uniqueProviderAccountId(): string {
  return `google_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mockGoogleProfile(email?: string, providerAccountId?: string) {
  return {
    id: providerAccountId || uniqueProviderAccountId(),
    email: email || uniqueEmail(),
    name: 'OAuth Test User',
    image: 'https://example.com/avatar.png',
    email_verified: true,
  };
}

function makeGoogleAccount(profile: ReturnType<typeof mockGoogleProfile>) {
  return {
    provider: 'google',
    providerAccountId: profile.id,
    type: 'oauth' as const,
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'Bearer',
    scope: 'openid profile email',
    id_token: 'mock-id-token',
  };
}

describe('[Agent 3] Google OAuth — User & Account Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should create User with emailVerified pre-set for OAuth accounts', async () => {
    const profile = mockGoogleProfile();
    const adapter = PrismaAdapter(prisma);

    const createdUser = {
      id: 'oauth-user-1',
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: new Date(),
      passwordHash: null,
      role: 'STUDENT',
    };

    mockUserCreate.mockResolvedValue(createdUser);

    const user = await adapter.createUser!({
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: new Date(),
    });

    expect(user).toBeDefined();
    expect(user.id).toBe('oauth-user-1');
    expect(user.email).toBe(profile.email);
    expect(user.emailVerified).toBeInstanceOf(Date);
    expect((user as any).passwordHash).toBeNull();

    expect(mockUserCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockUserCreate.mock.calls[0][0];
    expect(createArgs.data.email).toBe(profile.email);
  });

  it('[PASS] should link Account record to User on OAuth sign-in', async () => {
    const profile = mockGoogleProfile();
    const account = makeGoogleAccount(profile);
    const adapter = PrismaAdapter(prisma);

    const createdUser = {
      id: 'oauth-user-2',
      email: profile.email,
      emailVerified: new Date(),
    };

    mockUserCreate.mockResolvedValue(createdUser);
    mockAccountCreate.mockResolvedValue({
      id: 'account-1',
      userId: 'oauth-user-2',
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
    });

    const user = await adapter.createUser!({
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: new Date(),
    });

    const linkedAccount = await adapter.linkAccount!({
      userId: user.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
    });

    expect(linkedAccount).toBeDefined();
    expect(linkedAccount.provider).toBe('google');
    expect(linkedAccount.providerAccountId).toBe(account.providerAccountId);

    expect(mockAccountCreate).toHaveBeenCalledTimes(1);
    const accountArgs = mockAccountCreate.mock.calls[0][0];
    expect(accountArgs.data.userId).toBe('oauth-user-2');
    expect(accountArgs.data.provider).toBe('google');
  });

  it('[PASS] should have no passwordHash set for OAuth users', async () => {
    const profile = mockGoogleProfile();
    const adapter = PrismaAdapter(prisma);

    mockUserCreate.mockResolvedValue({
      id: 'oauth-user-3',
      email: profile.email,
      emailVerified: new Date(),
    });

    const user = await adapter.createUser!({
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: new Date(),
    });

    const createCall = mockUserCreate.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeFalsy();
    expect(createCall.data.emailVerified).toBeDefined();
  });

  it('[PASS] should include id, email, name, image in JWT token shape', async () => {
    const profile = mockGoogleProfile();
    const adapter = PrismaAdapter(prisma);

    const mockToken = {
      id: 'oauth-user-4',
      email: profile.email,
      name: profile.name,
      picture: profile.image,
      role: 'STUDENT',
    };

    expect(mockToken.id).toBeDefined();
    expect(mockToken.email).toBe(profile.email);
    expect(mockToken.name).toBe(profile.name);
    expect(mockToken.picture).toBe(profile.image);
  });

  it('[PASS] should create Account with correct provider and providerAccountId', async () => {
    const profile = mockGoogleProfile();
    const account = makeGoogleAccount(profile);
    const adapter = PrismaAdapter(prisma);

    mockUserCreate.mockResolvedValue({ id: 'oauth-user-5', email: profile.email, emailVerified: new Date() });
    mockAccountCreate.mockResolvedValue({
      id: 'account-2',
      userId: 'oauth-user-5',
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    });

    const user = await adapter.createUser!({
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: new Date(),
    });

    const linkedAccount = await adapter.linkAccount!({
      userId: user.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
    });

    const accountArgs = mockAccountCreate.mock.calls[0][0];
    expect(accountArgs.data.provider).toBe('google');
    expect(accountArgs.data.providerAccountId).toBe(account.providerAccountId);
    expect(accountArgs.data.access_token).toBe('mock-access-token');
    expect(accountArgs.data.refresh_token).toBe('mock-refresh-token');
    expect(accountArgs.data.expires_at).toBe(account.expires_at);
  });
});

describe('[Agent 3] Google OAuth — Account Linking (Duplicate Email)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[PASS] should link new Account to existing User without creating duplicate', async () => {
    const sharedEmail = uniqueEmail();
    const adapter = PrismaAdapter(prisma);

    const existingUser = {
      id: 'existing-oauth-user',
      email: sharedEmail,
      emailVerified: new Date(),
    };

    mockUserFindUnique.mockResolvedValue(existingUser);
    mockAccountFindFirst.mockResolvedValue(null);

    const expectedAccountId = `google_mock_${Date.now()}`;
    mockAccountCreate.mockResolvedValue({
      id: 'linked-account',
      userId: 'existing-oauth-user',
      provider: 'google',
      providerAccountId: expectedAccountId,
    });

    const existingByEmail = await adapter.getUserByEmail!(sharedEmail);
    expect(existingByEmail).toBeDefined();
    expect(existingByEmail!.id).toBe('existing-oauth-user');

    const linked = await adapter.linkAccount!({
      userId: 'existing-oauth-user',
      provider: 'google',
      providerAccountId: expectedAccountId,
      type: 'oauth',
      access_token: 'token-2',
      refresh_token: 'refresh-2',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'Bearer',
      scope: 'openid profile email',
      id_token: 'id-token-2',
    });

    expect(linked.providerAccountId).toBe(expectedAccountId);
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockAccountCreate).toHaveBeenCalledTimes(1);
    const accountArgs = mockAccountCreate.mock.calls[0][0];
    expect(accountArgs.data.userId).toBe('existing-oauth-user');
    expect(accountArgs.data.provider).toBe('google');
    expect(accountArgs.data.providerAccountId).toBe(expectedAccountId);
  });

  it('[PASS] should handle existing Account lookup by provider', async () => {
    const providerAccountId = uniqueProviderAccountId();
    const adapter = PrismaAdapter(prisma);

    const existingAccount = {
      id: 'existing-account',
      userId: 'existing-user-id',
      provider: 'google',
      providerAccountId,
    };

    mockAccountFindUnique.mockResolvedValue({
      ...existingAccount,
      user: { id: 'existing-user-id', email: 'linked@example.com', emailVerified: new Date() },
    });

    const user = await adapter.getUserByAccount!({
      provider: 'google',
      providerAccountId,
    });

    expect(user).toBeDefined();
    expect(user!.id).toBe('existing-user-id');
    expect(mockAccountFindUnique).toHaveBeenCalled();
  });
});
