import { AuthProvider, Role } from '@prisma/client';
import { OAuthService } from '../src/modules/auth/oauth.service';

describe('OAuthService account linking', () => {
  const emailUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'person@example.com',
    passwordHash: 'existing-password',
    authProvider: AuthProvider.EMAIL,
    providerId: null,
    emailVerified: true,
    isActive: true,
    role: Role.USER,
  };

  const prisma: any = {
    authIdentity: { findUnique: jest.fn(), upsert: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const session: any = {
    reactivateExpiredSuspension: jest.fn((user) => user),
    issueSession: jest.fn(() => ({ accessToken: 'access', refreshToken: 'refresh' })),
  };
  let service: OAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OAuthService(prisma, { get: jest.fn() } as any, session);
  });

  it('links a social identity to an email account without replacing its password provider', async () => {
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(emailUser);
    prisma.authIdentity.upsert.mockResolvedValue({});
    prisma.user.update.mockResolvedValue(emailUser);

    await (service as any).finishExternalAuth(
      AuthProvider.GOOGLE,
      'google-subject',
      'Person@Example.com',
    );

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.authIdentity.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: emailUser.id, provider: AuthProvider.GOOGLE }),
    }));
    expect(emailUser.authProvider).toBe(AuthProvider.EMAIL);
  });

  it('uses an existing linked identity even when Apple no longer returns the email', async () => {
    prisma.authIdentity.findUnique.mockResolvedValue({ user: emailUser });
    prisma.authIdentity.upsert.mockResolvedValue({});
    prisma.user.update.mockResolvedValue(emailUser);

    await expect((service as any).finishExternalAuth(
      AuthProvider.APPLE,
      'apple-subject',
      undefined,
    )).resolves.toHaveProperty('accessToken');

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a new Apple account with a placeholder email when Apple omits the email', async () => {
    const createdUser = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'apple-new-subject@apple.privacynull.soulmeet',
      passwordHash: null,
      authProvider: AuthProvider.APPLE,
      providerId: 'apple-new-subject',
      emailVerified: true,
      isActive: true,
      role: Role.USER,
    };
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(createdUser);
    prisma.authIdentity.upsert.mockResolvedValue({});
    prisma.user.update.mockResolvedValue(createdUser);

    await expect((service as any).finishExternalAuth(
      AuthProvider.APPLE,
      'apple-new-subject',
      undefined,
    )).resolves.toHaveProperty('accessToken');

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'apple-new-subject@apple.privacynull.soulmeet',
        authProvider: AuthProvider.APPLE,
        providerId: 'apple-new-subject',
      }),
    }));
  });
});
