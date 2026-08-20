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
});
