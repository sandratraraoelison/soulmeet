import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SessionService } from './session.service';
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUrl,
  verifyTotp,
} from './totp.util';

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly session: SessionService,
  ) {}

  async challengeToken(user: { id: string; email: string; role: Role }) {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, type: '2fa' },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: '5m',
      },
    );
  }

  async completeTwoFactorLogin(
    twoFactorToken: string,
    code: string,
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(twoFactorToken, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== '2fa') throw new Error('Invalid token type');
    } catch {
      throw new UnauthorizedException('Invalid or expired verification');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      await this.auditAdminLogin(
        user,
        false,
        ipAddress,
        'Two-factor not enabled',
      );
      throw new UnauthorizedException('Two-factor authentication is not enabled');
    }
    const valid = verifyTotp(user.twoFactorSecret, code);
    if (!valid && (await this.consumeRecoveryCode(user, code))) {
      await this.auditAdminLogin(user, true, ipAddress, 'Recovery code');
      return this.session.issueSession(user, deviceInfo);
    }
    if (!valid) {
      await this.auditAdminLogin(user, false, ipAddress, 'Invalid two-factor code');
      throw new UnauthorizedException('Invalid or expired two-factor code');
    }
    await this.auditAdminLogin(user, true, ipAddress);
    return this.session.issueSession(user, deviceInfo);
  }

  async setupTwoFactor(userId: string, email: string, role: Role) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (existing?.twoFactorEnabled)
      throw new BadRequestException('Two-factor authentication is already enabled');
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
    return {
      secret,
      otpauthUrl: otpauthUrl(secret, email, 'Soulmeet Admin'),
      issuer: 'Soulmeet Admin',
      role,
    };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret)
      throw new BadRequestException(
        'Start the setup before enabling two-factor authentication',
      );
    if (!verifyTotp(user.twoFactorSecret, code))
      throw new UnauthorizedException('Invalid verification code');
    const recoveryCodes = generateRecoveryCodes();
    const pepper = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorRecoveryCodes: recoveryCodes.map((codeItem) =>
          hashRecoveryCode(codeItem, pepper),
        ) as unknown as Prisma.InputJsonValue,
      },
    });
    return { recoveryCodes };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret)
      throw new BadRequestException('Two-factor authentication is not enabled');
    if (!verifyTotp(user.twoFactorSecret, code))
      throw new UnauthorizedException('Invalid verification code');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: Prisma.JsonNull,
      },
    });
    return { message: 'Two-factor authentication disabled' };
  }

  private async consumeRecoveryCode(
    user: { id: string; twoFactorRecoveryCodes: unknown },
    code: string,
  ): Promise<boolean> {
    const codes = Array.isArray(user.twoFactorRecoveryCodes)
      ? (user.twoFactorRecoveryCodes as string[])
      : [];
    if (!codes.length) return false;
    const pepper = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const expected = hashRecoveryCode(code.toUpperCase(), pepper);
    const index = codes.indexOf(expected);
    if (index < 0) return false;
    const remaining = codes.filter((_, position) => position !== index);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorRecoveryCodes:
          (remaining as string[]) as unknown as Prisma.InputJsonValue,
      },
    });
    return true;
  }

  private async auditAdminLogin(
    user: { id: string; role: Role } | null | undefined,
    success: boolean,
    ipAddress?: string,
    note?: string,
  ) {
    if (!user) return;
    const adminRoles: Role[] = [
      Role.SUPER_ADMIN,
      Role.ADMIN,
      Role.MODERATOR,
      Role.SUPPORT,
    ];
    if (!adminRoles.includes(user.role)) return;
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: success ? 'ADMIN_LOGIN_SUCCESS' : 'ADMIN_LOGIN_FAILED',
          resource: 'Auth',
          resourceId: user.id,
          ipAddress,
          success,
          newValue: note ? { note } : undefined,
        },
      });
    } catch {
      // Auditing must never break the authentication flow.
    }
  }
}
