import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthProvider, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import type { AddressInfo } from 'net';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { DailyCoachCheckInService } from '../src/modules/guidance/daily-coach-check-in.service';
import { SoulprintExtractionQueueService } from '../src/modules/soulprint/services/soulprint-extraction-queue.service';
import { AppModule } from '../src/app.module';

/**
 * End-to-end tests for the authentication HTTP pipeline (validation pipe,
 * controllers, JWT issuance, refresh rotation, logout). PrismaService is
 * replaced by an in-memory mock so the tests never touch a database, and the
 * background workers are disabled via environment flags.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: any;

  const user = {
    id: 'e2e-user-id',
    email: 'e2e@example.com',
    passwordHash: '',
    authProvider: AuthProvider.EMAIL,
    role: Role.USER,
    isActive: true,
    accountStatus: 'ACTIVE',
    suspendedUntil: null,
    moderationReason: null,
    emailVerified: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorRecoveryCodes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  beforeAll(async () => {
    // Stable JWT secrets for the test run.
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'b'.repeat(32);

    user.passwordHash = await argon2.hash('password123');
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: { data: typeof user }) => ({
          ...user,
          email: data.email,
          authProvider: data.authProvider,
        })),
        update: jest.fn().mockImplementation(({ data }) => ({ ...user, ...data })),
      },
      profile: { create: jest.fn() },
      refreshToken: {
        create: jest.fn().mockImplementation(({ data }) => ({ ...data })),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(({ data }) => ({ ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: { create: jest.fn() },
      passwordResetToken: { upsert: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(async (callback: unknown) =>
        typeof callback === 'function' ? callback(prisma) : callback,
      ),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      // Background workers must not poll against the mock at startup.
      .overrideProvider(SoulprintExtractionQueueService)
      .useValue({})
      .overrideProvider(DailyCoachCheckInService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  const register = () =>
    fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jane@example.com',
        password: 'password123',
        firstName: 'Jane',
        birthDate: '1998-06-15',
        gender: 'FEMALE',
        country: 'France',
        location: 'Paris',
      }),
    });

  it('registers a user and returns access and refresh tokens', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const response = await register();
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.profile.create).toHaveBeenCalled();
  });

  it('rejects a duplicate email with 409', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(user);
    const response = await register();
    expect(response.status).toBe(409);
  });

  it('logs in with valid credentials and rejects bad ones', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.refreshToken.create.mockClear();
    const ok = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'password123' }),
    });
    expect(ok.status).toBe(201);
    expect(prisma.refreshToken.create).toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue(user);
    const bad = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'wrong-password' }),
    });
    expect(bad.status).toBe(401);
  });

  it('rotates a valid refresh token and revokes the old one', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'password123' }),
    });
    const { refreshToken } = (await login.json()) as { refreshToken: string };

    const stored = {
      id: 'token-id',
      userId: user.id,
      tokenHash: await argon2.hash(refreshToken),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      user,
    };
    prisma.refreshToken.findUnique.mockResolvedValue(stored);

    const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { accessToken: string };
    expect(body.accessToken).toBeTruthy();
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: stored.id } }),
    );
  });

  it('logs out and revokes the current refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'password123' }),
    });
    const { refreshToken } = (await login.json()) as { refreshToken: string };

    const stored = {
      id: 'token-id',
      userId: user.id,
      tokenHash: await argon2.hash(refreshToken),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      user,
    };
    prisma.refreshToken.findUnique.mockResolvedValue(stored);

    const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    expect(response.status).toBe(201);
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: stored.id } }),
    );
  });
});
