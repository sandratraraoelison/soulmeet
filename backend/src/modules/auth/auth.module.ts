import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OAuthService } from './oauth.service';
import { PasswordResetEmailService } from './password-reset-email.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { SessionEventsService } from './session-events.service';
import { SessionService } from './session.service';
import { TwoFactorService } from './two-factor.service';
@Module({
  imports: [JwtModule.register({}), forwardRef(() => UsersModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionEventsService,
    OAuthService,
    TwoFactorService,
    PasswordService,
    JwtAuthGuard,
    RolesGuard,
    PasswordResetEmailService,
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtModule, SessionEventsService],
})
export class AuthModule {}
