import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';
import { MatchHistoryQueryDto, MatchResponseDto, DiscoverQueryDto } from './match-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('discover')
  @ApiOperation({ summary: 'List active public profiles available for discovery' })
  discover(@CurrentUser() user: JwtPayload, @Query() query: DiscoverQueryDto) {
    return this.users.discover(user.sub, query.limit, query.offset);
  }

  @Get('matches')
  @ApiOperation({ summary: 'Return the matchmaking lifecycle and any presentation-ready recommendations' })
  matches(@CurrentUser() user: JwtPayload) {
    return this.users.matches(user.sub);
  }

  @Post('matches/activate')
  @ApiOperation({ summary: 'Consent to matching with eligible Soulprint details and begin searching' })
  activateMatches(@CurrentUser() user: JwtPayload) {
    return this.users.activateMatchmaking(user.sub);
  }

  @Get('matches/history')
  @ApiOperation({ summary: 'List accepted and rejected match recommendations' })
  matchHistory(@CurrentUser() user: JwtPayload, @Query() query: MatchHistoryQueryDto) {
    return this.users.matchHistory(user.sub, query.response);
  }

  @Post('matches/:matchedUserId/respond')
  @ApiOperation({ summary: 'Accept or reject a match recommendation' })
  respondToMatch(
    @CurrentUser() user: JwtPayload,
    @Param('matchedUserId') matchedUserId: string,
    @Body() dto: MatchResponseDto,
  ) {
    return this.users.respondToMatch(user.sub, matchedUserId, dto.response);
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
