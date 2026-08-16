import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PrismaService } from '../../database/prisma.service';
import { AccountStatus } from '@prisma/client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Missing access token');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access') throw new Error('Invalid token type');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true, accountStatus: true, suspendedUntil: true } });
      if (!user) throw new Error('User not found');
      const suspensionExpired = user.accountStatus === AccountStatus.SUSPENDED && user.suspendedUntil !== null && user.suspendedUntil <= new Date();
      if (suspensionExpired) {
        await this.prisma.user.update({ where: { id: payload.sub }, data: { isActive: true, accountStatus: AccountStatus.ACTIVE, suspendedUntil: null, moderationReason: null } });
      } else if (!user.isActive || user.accountStatus !== AccountStatus.ACTIVE) {
        throw new Error('Account disabled');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
