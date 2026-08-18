import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
/** Limits authenticated traffic per account while public traffic remains IP-bound. */
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super(options, storage, reflector);
  }

  protected override async getTracker(request: Record<string, any>): Promise<string> {
    const authorization = request.headers?.authorization;
    const [type, token] = typeof authorization === 'string' ? authorization.split(' ') : [];
    if (type === 'Bearer' && token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
        if (payload.type === 'access' && payload.sub) return `user:${payload.sub}`;
      } catch {
        // Invalid credentials are still throttled by IP before JwtAuthGuard rejects them.
      }
    }
    return `ip:${await super.getTracker(request)}`;
  }
}
