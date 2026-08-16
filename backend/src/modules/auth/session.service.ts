import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Prisma, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SessionEventsService } from './session-events.service';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: SessionEventsService,
  ) {}

  async reactivateExpiredSuspension(user: User): Promise<User> {
    if (
      user.accountStatus !== AccountStatus.SUSPENDED ||
      !user.suspendedUntil ||
      user.suspendedUntil > new Date()
    )
      return user;
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        accountStatus: AccountStatus.ACTIVE,
        suspendedUntil: null,
        moderationReason: null,
      },
    });
  }

  async refresh(rawToken: string, deviceInfo?: string) {
    const payload = await this.verifyRefresh(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId! },
      include: { user: true },
    });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt <= new Date() ||
      !stored.user.isActive ||
      !(await argon2.verify(stored.tokenHash, rawToken))
    )
      throw new UnauthorizedException('Invalid refresh token');
    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      return this.issueSession(stored.user, deviceInfo, tx);
    });
  }

  async logout(rawToken: string): Promise<{ message: string }> {
    const payload = await this.verifyRefresh(rawToken);
    const token = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId! },
    });
    if (
      token &&
      !token.revokedAt &&
      (await argon2.verify(token.tokenHash, rawToken))
    ) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
      this.events.emitSessionRevoked(payload.sub);
    }
    return { message: 'Logged out' };
  }

  private async verifyRefresh(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (payload.type !== 'refresh' || !payload.tokenId) throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async issueSession(
    user: { id: string; email: string; role: Role },
    deviceInfo?: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const tokenId = randomUUID();
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const refreshPayload: JwtPayload = {
      ...accessPayload,
      type: 'refresh',
      tokenId,
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
    });
    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await db.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(decoded.exp * 1000),
        deviceInfo,
      },
    });
    return { accessToken, refreshToken, tokenType: 'Bearer' };
  }
}
