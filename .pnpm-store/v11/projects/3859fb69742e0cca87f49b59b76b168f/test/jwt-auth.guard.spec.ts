import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('denies requests without a JWT', async () => {
    const guard = new JwtAuthGuard({} as any, {} as any);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as any;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
