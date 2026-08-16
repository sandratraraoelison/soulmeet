import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, Role, SexualOrientation } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { OAuthService } from './oauth.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TwoFactorService } from './two-factor.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
    private readonly oauth: OAuthService,
    private readonly twoFactor: TwoFactorService,
    private readonly password: PasswordService,
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
    return this.session.issueSession(user, deviceInfo);
  }

  async login(dto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const storedUser = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    const user = storedUser
      ? await this.session.reactivateExpiredSuspension(storedUser)
      : null;
    if (
      !user?.passwordHash ||
      !user.isActive ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      await this.auditAdminLogin(user, false, ipAddress, 'Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.auditAdminLogin(user, true, ipAddress);
    if (user.twoFactorEnabled) {
      const twoFactorToken = await this.twoFactor.challengeToken(user);
      return { requiresTwoFactor: true, twoFactorToken };
    }
    return this.session.issueSession(user, deviceInfo);
  }

  async completeTwoFactorLogin(
    twoFactorToken: string,
    code: string,
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    return this.twoFactor.completeTwoFactorLogin(
      twoFactorToken,
      code,
      deviceInfo,
      ipAddress,
    );
  }

  async setupTwoFactor(userId: string, email: string, role: Role) {
    return this.twoFactor.setupTwoFactor(userId, email, role);
  }
  async enableTwoFactor(userId: string, code: string) {
    return this.twoFactor.enableTwoFactor(userId, code);
  }
  async disableTwoFactor(userId: string, code: string) {
    return this.twoFactor.disableTwoFactor(userId, code);
  }

  async google(identityToken: string, deviceInfo?: string) {
    return this.oauth.google(identityToken, deviceInfo);
  }
  async apple(identityToken: string, deviceInfo?: string) {
    return this.oauth.apple(identityToken, deviceInfo);
  }

  async refresh(rawToken: string, deviceInfo?: string) {
    return this.session.refresh(rawToken, deviceInfo);
  }
  async logout(rawToken: string): Promise<{ message: string }> {
    return this.session.logout(rawToken);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    return this.password.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }
  async forgotPassword(rawEmail: string) {
    return this.password.forgotPassword(rawEmail);
  }
  async resetPassword(rawEmail: string, code: string, newPassword: string) {
    return this.password.resetPassword(rawEmail, code, newPassword);
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
