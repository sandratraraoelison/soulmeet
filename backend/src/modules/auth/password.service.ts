import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHmac, randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { PasswordResetEmailService } from './password-reset-email.service';
import { SessionEventsService } from './session-events.service';

@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly passwordResetEmail: PasswordResetEmailService,
    private readonly events: SessionEventsService,
  ) {}

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash)
      throw new BadRequestException(
        'Password changes are only available for email accounts',
      );
    if (!(await argon2.verify(user.passwordHash, currentPassword)))
      throw new UnauthorizedException('Current password is incorrect');
    if (currentPassword === newPassword)
      throw new BadRequestException('Choose a different password');
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    this.events.emitSessionRevoked(userId);
    return { message: 'Password changed. Sign in again on your devices.' };
  }

  async forgotPassword(rawEmail: string) {
    const message = 'If an eligible account exists, a reset code has been sent.';
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !user.isActive || user.authProvider !== 'EMAIL')
      return { message };
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tokenHash: this.resetCodeHash(email, code),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
      update: {
        tokenHash: this.resetCodeHash(email, code),
        expiresAt: new Date(Date.now() + 15 * 60_000),
        createdAt: new Date(),
      },
    });
    await this.passwordResetEmail.send(email, code);
    return { message };
  }

  async resetPassword(rawEmail: string, code: string, newPassword: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { passwordResetToken: true },
    });
    const reset = user?.passwordResetToken;
    if (
      !user?.passwordHash ||
      !reset ||
      reset.expiresAt <= new Date() ||
      reset.tokenHash !== this.resetCodeHash(email, code)
    ) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    if (await argon2.verify(user.passwordHash, newPassword))
      throw new BadRequestException('Choose a different password');
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.passwordResetToken.delete({ where: { userId: user.id } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    this.events.emitSessionRevoked(user.id);
    return { message: 'Password reset successfully. You can now sign in.' };
  }

  private resetCodeHash(email: string, code: string) {
    return createHmac(
      'sha256',
      this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    )
      .update(`${email}:${code}`)
      .digest('hex');
  }
}
