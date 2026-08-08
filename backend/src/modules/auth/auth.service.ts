import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Prisma, Role, SexualOrientation } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import * as jsonwebtoken from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import * as argon2 from 'argon2';
import { createHmac, randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordResetEmailService } from './password-reset-email.service';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();
  private readonly appleKeys = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
    rateLimit: true,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly passwordResetEmail: PasswordResetEmailService,
  ) {}

  async register(dto: RegisterDto, deviceInfo?: string) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already in use');
    const birthDate = new Date(dto.birthDate);
    const today = new Date();
    const adultCutoff = new Date(
      Date.UTC(
        today.getUTCFullYear() - 18,
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );
    const oldestAllowed = new Date(
      Date.UTC(
        today.getUTCFullYear() - 120,
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );
    if (birthDate > adultCutoff)
      throw new BadRequestException('You must be at least 18 years old');
    if (birthDate < oldestAllowed || birthDate > today)
      throw new BadRequestException('Invalid birth date');
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email, passwordHash, authProvider: AuthProvider.EMAIL },
      });
      await tx.profile.create({
        data: {
          userId: createdUser.id,
          firstName: dto.firstName.trim(),
          birthDate,
          gender: dto.gender,
          sexualOrientation: SexualOrientation.PREFER_NOT_TO_SAY,
          country: dto.country.trim(),
          city: dto.location.trim(),
        },
      });
      return createdUser;
    });
    return this.issueSession(user, deviceInfo);
  }

  async login(dto: LoginDto, deviceInfo?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user?.passwordHash ||
      !user.isActive ||
      !(await argon2.verify(user.passwordHash, dto.password))
    )
      throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueSession(user, deviceInfo);
  }

  async google(identityToken: string, deviceInfo?: string) {
    try {
      const audiences = this.providerIds('GOOGLE_CLIENT_IDS');
      const ticket = await this.googleClient.verifyIdToken({
        idToken: identityToken,
        audience: audiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified)
        throw new Error('Missing verified Google identity');
      return this.finishExternalAuth(
        AuthProvider.GOOGLE,
        payload.sub,
        payload.email,
        deviceInfo,
      );
    } catch {
      throw new UnauthorizedException('Invalid Google identity token');
    }
  }

  async apple(identityToken: string, deviceInfo?: string) {
    try {
      const audiences = this.providerIds('APPLE_CLIENT_IDS');
      const decoded = jsonwebtoken.decode(identityToken, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid)
        throw new Error('Missing Apple key identifier');
      const key = await this.appleKeys.getSigningKey(decoded.header.kid);
      const payload = jsonwebtoken.verify(identityToken, key.getPublicKey(), {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: audiences,
      }) as jsonwebtoken.JwtPayload;
      if (!payload.sub || typeof payload.email !== 'string')
        throw new Error('Missing Apple identity');
      return this.finishExternalAuth(
        AuthProvider.APPLE,
        payload.sub,
        payload.email,
        deviceInfo,
      );
    } catch {
      throw new UnauthorizedException('Invalid Apple identity token');
    }
  }

  private providerIds(
    key: 'GOOGLE_CLIENT_IDS' | 'APPLE_CLIENT_IDS',
  ): [string, ...string[]] {
    const ids = (this.config.get<string>(key) ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!ids.length) throw new Error(`${key} is not configured`);
    return ids as [string, ...string[]];
  }

  private async finishExternalAuth(
    provider: AuthProvider,
    providerId: string,
    rawEmail: string,
    deviceInfo?: string,
  ) {
    const email = rawEmail.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: {
        authProvider_providerId: { authProvider: provider, providerId },
      },
    });
    if (!user) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      user = existing
        ? await this.prisma.user.update({
            where: { id: existing.id },
            data: { authProvider: provider, providerId, emailVerified: true },
          })
        : await this.prisma.user.create({
            data: {
              email,
              authProvider: provider,
              providerId,
              emailVerified: true,
            },
          });
    }
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueSession(user, deviceInfo);
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
    )
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date() },
      });
    return { message: 'Logged out' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('Password changes are only available for email accounts');
    if (!(await argon2.verify(user.passwordHash, currentPassword))) throw new UnauthorizedException('Current password is incorrect');
    if (currentPassword === newPassword) throw new BadRequestException('Choose a different password');
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password changed. Sign in again on your devices.' };
  }

  async forgotPassword(rawEmail: string) {
    const message = 'If an eligible account exists, a reset code has been sent.';
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !user.isActive || user.authProvider !== AuthProvider.EMAIL) return { message };
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, tokenHash: this.resetCodeHash(email, code), expiresAt: new Date(Date.now() + 15 * 60_000) },
      update: { tokenHash: this.resetCodeHash(email, code), expiresAt: new Date(Date.now() + 15 * 60_000), createdAt: new Date() },
    });
    await this.passwordResetEmail.send(email, code);
    return { message };
  }

  async resetPassword(rawEmail: string, code: string, newPassword: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, include: { passwordResetToken: true } });
    const reset = user?.passwordResetToken;
    if (!user?.passwordHash || !reset || reset.expiresAt <= new Date() || reset.tokenHash !== this.resetCodeHash(email, code)) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    if (await argon2.verify(user.passwordHash, newPassword)) throw new BadRequestException('Choose a different password');
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.passwordResetToken.delete({ where: { userId: user.id } }),
      this.prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password reset successfully. You can now sign in.' };
  }

  private resetCodeHash(email: string, code: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_REFRESH_SECRET')).update(`${email}:${code}`).digest('hex');
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

  private async issueSession(
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
