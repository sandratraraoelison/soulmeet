import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../database/prisma.service';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import type { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';

@Injectable()
export class WsJwtGuard {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(client: AuthenticatedSocket) {
    const authToken = client.handshake.auth?.token as string | undefined;
    const authorization = client.handshake.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    const token = authToken ?? bearerToken;
    if (!token) throw new Error('Missing access token');
    const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
    if (payload.type !== 'access') throw new Error('Invalid token type');
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
      select: { id: true, email: true },
    });
    if (!user) throw new Error('User not found');
    client.data.user = user;
    return user;
  }
}
