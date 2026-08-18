import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  ExternalAuthDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
  TwoFactorLoginDto,
} from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}
  @Post('register')
  @ApiOperation({ summary: 'Créer un compte e-mail et ouvrir une session' })
  @ApiCreatedResponse({ description: 'Access token et refresh token créés' })
  register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.register(dto, device);
  }
  @Post('login')
  @ApiOperation({ summary: 'Ouvrir une session avec e-mail et mot de passe', description: 'Retourne les tokens, ou requiresTwoFactor plus un twoFactorToken de 5 minutes quand le compte admin a activé la double authentification.' })
  @ApiOkResponse({ description: 'Access token et refresh token retournés' })
  @ApiUnauthorizedResponse({ description: 'Identifiants invalides ou compte désactivé' })
  login(
    @Body() dto: LoginDto,
    @Headers('user-agent') device?: string,
    @Headers('x-device-info') dashboardDevice?: string,
    @Req() req?: Request,
  ) {
    return this.auth.login(dto, dashboardDevice ?? device, req?.ip ?? req?.socket?.remoteAddress);
  }
  @Post('login/2fa')
  @ApiOperation({ summary: 'Valider la double authentification et ouvrir la session' })
  @ApiUnauthorizedResponse({ description: 'Code TOTP ou de récupération invalide, ou twoFactorToken expiré' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  completeTwoFactor(
    @Body() dto: TwoFactorLoginDto,
    @Headers('user-agent') device?: string,
    @Headers('x-device-info') dashboardDevice?: string,
    @Req() req?: Request,
  ) {
    return this.auth.completeTwoFactorLogin(dto.twoFactorToken, dto.code, dashboardDevice ?? device, req?.ip ?? req?.socket?.remoteAddress);
  }
  @Post('2fa/setup') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.SUPPORT) @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer un secret TOTP pour un compte administrateur' })
  setupTwoFactor(@CurrentUser() user: JwtPayload) {
    return this.auth.setupTwoFactor(user.sub, user.email, user.role as Role);
  }
  @Post('2fa/enable') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.SUPPORT) @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirmer le code et activer la double authentification', description: 'Retourne une seule fois les codes de récupération à conserver.' })
  enableTwoFactor(@CurrentUser() user: JwtPayload, @Body() dto: TwoFactorCodeDto) {
    return this.auth.enableTwoFactor(user.sub, dto.code);
  }
  @Post('2fa/disable') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.SUPPORT) @ApiBearerAuth()
  @ApiOperation({ summary: 'Désactiver la double authentification avec un code TOTP valide' })
  disableTwoFactor(@CurrentUser() user: JwtPayload, @Body() dto: TwoFactorCodeDto) {
    return this.auth.disableTwoFactor(user.sub, dto.code);
  }
  @Post('google')
  @ApiOperation({ summary: 'Ouvrir une session avec un identity token Google vérifié' })
  google(
    @Body() dto: ExternalAuthDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.google(dto.identityToken, device);
  }
  @Post('apple')
  @ApiOperation({ summary: 'Ouvrir une session avec un identity token Apple vérifié' })
  apple(
    @Body() dto: ExternalAuthDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.apple(dto.identityToken, device);
  }
  @Post('refresh')
  @ApiOperation({ summary: 'Faire tourner le refresh token et renouveler la session' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide, expiré ou révoqué' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken, dto.deviceInfo);
  }
  @Post('logout')
  @ApiOperation({ summary: 'Révoquer le refresh token courant' })
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }
  @Post('forgot-password')
  @ApiOperation({ summary: 'Demander un code de récupération par e-mail', description: 'Retourne toujours une réponse générique afin de ne pas révéler si le compte existe. Limite : 3 requêtes par minute.' })
  @ApiOkResponse({ description: 'Demande acceptée ; un code est envoyé si le compte est éligible' })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }
  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le code reçu', description: 'Le code à six chiffres expire après 15 minutes. Toutes les sessions actives sont révoquées.' })
  @ApiBadRequestResponse({ description: 'Code invalide/expiré ou nouveau mot de passe identique' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.code, dto.newPassword);
  }
  @Get('me') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Lire l’utilisateur authentifié' })
  me(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.findPublicById(user.sub);
  }
  @Post('change-password') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer le mot de passe du compte e-mail', description: 'Vérifie le mot de passe actuel puis révoque toutes les sessions.' })
  @ApiUnauthorizedResponse({ description: 'Mot de passe actuel incorrect' })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }
}
