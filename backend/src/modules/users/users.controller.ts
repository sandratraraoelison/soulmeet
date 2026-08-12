import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('discover')
  @ApiOperation({ summary: 'List active public profiles available for discovery' })
  discover(@CurrentUser() user: JwtPayload) {
    return this.users.discover(user.sub);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Return three reciprocal Soulprint-based compatibility recommendations' })
  matches(@CurrentUser() user: JwtPayload) {
    return this.users.matches(user.sub);
  }

  @Get(':userId/public-profile')
  @ApiOperation({ summary: 'Get a safe public profile' })
  publicProfile(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.users.findPublicProfile(user.sub, userId);
  }
}
