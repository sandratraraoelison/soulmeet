import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Gender, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from '../src/modules/auth/auth.service';
import { OAuthService } from '../src/modules/auth/oauth.service';
import { PasswordService } from '../src/modules/auth/password.service';
import { SessionEventsService } from '../src/modules/auth/session-events.service';
import { SessionService } from '../src/modules/auth/session.service';
import { TwoFactorService } from '../src/modules/auth/two-factor.service';

describe('AuthService', () => {
  const registration = {
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    birthDate: '1998-06-15',
    gender: Gender.FEMALE,
    country: 'France',
    location: 'Paris',
  };
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'jane@example.com',
    passwordHash: '',
    authProvider: AuthProvider.EMAIL,
    role: Role.USER,
    isActive: true,
  };
  let prisma: any;
  let service: AuthService;
  beforeEach(async () => {
    user.passwordHash = await argon2.hash('password123');
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(user),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      profile: { create: jest.fn() },
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };
    const jwt = new JwtService();
    const config = {
      getOrThrow: (key: string) =>
        ({
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_REFRESH_SECRET: 'b'.repeat(32),
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '30d',
        })[key],
    } as ConfigService;
    const events = new SessionEventsService();
    const session = new SessionService(prisma, jwt, config, events);
    const oauth = new OAuthService(prisma, config, session);
    const twoFactor = new TwoFactorService(prisma, jwt, config, session);
    const password = new PasswordService(
      prisma,
      config,
      { send: jest.fn() } as any,
      events,
    );
    service = new AuthService(prisma, session, oauth, twoFactor, password);
  });

  it('registers a user and returns tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await service.register({
      ...registration,
      email: 'Jane@example.com',
    });
    expect(result.accessToken).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'jane@example.com' }),
      }),
    );
  });
  it('rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.register(registration)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('logs in with the correct password', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(
      service.login({ email: user.email, password: 'password123' }),
    ).resolves.toHaveProperty('refreshToken');
  });
  it('rejects an incorrect password', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(
      service.login({ email: user.email, password: 'incorrect' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rotates a valid refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const session = await service.register(registration);
    const created = prisma.refreshToken.create.mock.calls[0][0].data;
    prisma.refreshToken.findUnique.mockResolvedValue({
      ...created,
      revokedAt: null,
      user,
    });
    const refreshed = await service.refresh(session.refreshToken);
    expect(refreshed.accessToken).toBeDefined();
    expect(prisma.refreshToken.update).toHaveBeenCalled();
  });
});
