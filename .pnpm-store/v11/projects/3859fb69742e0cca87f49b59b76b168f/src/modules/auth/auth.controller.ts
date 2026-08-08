import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import {
  ExternalAuthDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
} from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}
  @Post('register') register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.register(dto, device);
  }
  @Post('login') login(
    @Body() dto: LoginDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.login(dto, device);
  }
  @Post('google') google(
    @Body() dto: ExternalAuthDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.google(dto.identityToken, device);
  }
  @Post('apple') apple(
    @Body() dto: ExternalAuthDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.auth.apple(dto.identityToken, device);
  }
  @Post('refresh') refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken, dto.deviceInfo);
  }
  @Post('logout') logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }
  @Get('me') @UseGuards(JwtAuthGuard) @ApiBearerAuth() me(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.users.findPublicById(user.sub);
  }
}
