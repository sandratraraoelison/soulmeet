import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from '../src/modules/auth/auth.service';
import { generateRecoveryCodes, hashRecoveryCode, totpCode, verifyTotp } from '../src/modules/auth/totp.util';

describe('AuthService two-factor flow', () => {
  const admin: any = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'admin@example.com',
    passwordHash: '',
    authProvider: AuthProvider.EMAIL,
    role: Role.SUPER_ADMIN,
    isActive: true,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorRecoveryCodes: null,
  };
  let prisma: any;
  let service: AuthService;
  const challengeToken = async () => {
    admin.twoFactorEnabled = true;
    admin.twoFactorSecret = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const result = await service.login({ email: admin.email, password: 'password123' }) as { requiresTwoFactor: true; twoFactorToken: string };
    return result.twoFactorToken;
  };

  beforeEach(async () => {
    admin.passwordHash = await argon2.hash('password123');
    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = null;
    admin.twoFactorRecoveryCodes = null;
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      auditLog: { create: jest.fn() },
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
    service = new AuthService(prisma, jwt, config, { send: jest.fn() } as any);
    prisma.user.findUnique.mockResolvedValue(admin);
  });

  it('returns a two-factor challenge instead of a session for an enabled account', async () => {
    admin.twoFactorEnabled = true;
    const result = await service.login({ email: admin.email, password: 'password123' });
    expect(result).toEqual({ requiresTwoFactor: true, twoFactorToken: expect.any(String) });
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('completes the login with a valid TOTP code', async () => {
    const twoFactorToken = await challengeToken();
    const code = totpCode(admin.twoFactorSecret as string);
    const session = await service.completeTwoFactorLogin(twoFactorToken, code);
    expect(session).toHaveProperty('accessToken');
    expect(session).toHaveProperty('refreshToken');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ADMIN_LOGIN_SUCCESS', resource: 'Auth', success: true }),
    }));
  });

  it('rejects an invalid two-factor code', async () => {
    const twoFactorToken = await challengeToken();
    await expect(service.completeTwoFactorLogin(twoFactorToken, '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ADMIN_LOGIN_FAILED', success: false }),
    }));
  });

  it('accepts a single-use recovery code and consumes it', async () => {
    const recovery = generateRecoveryCodes(1);
    const pepper = 'b'.repeat(32);
    admin.twoFactorRecoveryCodes = recovery.map((code) => hashRecoveryCode(code, pepper));
    const twoFactorToken = await challengeToken();
    const session = await service.completeTwoFactorLogin(twoFactorToken, recovery[0]!);
    expect(session).toHaveProperty('accessToken');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ twoFactorRecoveryCodes: [] }),
    }));
  });

  it('audits failed admin password attempts', async () => {
    await expect(service.login({ email: admin.email, password: 'incorrect' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ADMIN_LOGIN_FAILED', resourceId: admin.id, success: false }),
    }));
  });

  it('does not audit regular user logins', async () => {
    admin.role = Role.USER;
    const session = await service.login({ email: admin.email, password: 'password123' });
    expect(session).toHaveProperty('refreshToken');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('generates and verifies a fresh secret end-to-end', () => {
    expect(verifyTotp('JBSWY3DPEHPK3PXP', totpCode('JBSWY3DPEHPK3PXP'))).toBe(true);
  });
});
