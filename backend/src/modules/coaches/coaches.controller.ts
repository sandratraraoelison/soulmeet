import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoachesService } from './coaches.service';
import { CreateCoachDto, UpdateCoachDto } from './dto/coach.dto';
@ApiTags('coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('coach')
export class CoachesController {
  constructor(private readonly coaches: CoachesService) {}
  @Post() create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCoachDto) {
    return this.coaches.create(user.sub, dto);
  }
  @Get() get(@CurrentUser() user: JwtPayload) {
    return this.coaches.get(user.sub);
  }
  @Put() update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateCoachDto) {
    return this.coaches.update(user.sub, dto);
  }
}
