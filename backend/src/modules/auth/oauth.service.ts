import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import * as jsonwebtoken from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { PrismaService } from '../../database/prisma.service';
import { SessionService } from './session.service';

@Injectable()
export class OAuthService {
  private readonly googleClient = new OAuth2Client();
  private readonly appleKeys = jwksClient({
    jwksUri: 'https://appleid.apple.com/auth/keys',
    cache: true,
    rateLimit: true,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly session: SessionService,
  ) {}

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
    user = await this.session.reactivateExpiredSuspension(user);
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.session.issueSession(user, deviceInfo);
  }
}
