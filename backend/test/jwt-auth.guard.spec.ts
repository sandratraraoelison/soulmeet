import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('denies requests without a JWT', async () => {
    const guard = new JwtAuthGuard({} as any, {} as any, {} as any);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('automatically restores an expired suspension', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id', type: 'access' }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('secret') };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ isActive: false, accountStatus: 'SUSPENDED', suspendedUntil: new Date(Date.now() - 1000) }), update: jest.fn() } };
    const guard = new JwtAuthGuard(jwt as any, config as any, prisma as any);
    const request = { headers: { authorization: 'Bearer token' } } as any;
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as any;
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accountStatus: 'ACTIVE', isActive: true }) }));
  });

  it('rejects a banned account even with an unexpired access token', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id', type: 'access' }) };
    const config = { getOrThrow: jest.fn().mockReturnValue('secret') };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ isActive: false, accountStatus: 'BANNED', suspendedUntil: null }) } };
    const guard = new JwtAuthGuard(jwt as any, config as any, prisma as any);
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer token' } }) }) } as any;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
