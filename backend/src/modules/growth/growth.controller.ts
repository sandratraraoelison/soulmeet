import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CompleteGrowthExerciseDto,
  CreateGrowthGoalDto,
  CreateGrowthJournalDto,
  EnrollGrowthPathDto,
  GrowthActivityQueryDto,
  UpdateGrowthGoalDto,
  UpdateGrowthPreferencesDto,
  UpdateGrowthProgressDto,
  UpsertGrowthCheckInDto,
} from './dto/growth.dto';
import { GrowthService } from './growth.service';

@ApiTags('growth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('growth')
export class GrowthController {
  constructor(private readonly growth: GrowthService) {}

  @Get() overview(@CurrentUser() user: JwtPayload) {
    return this.growth.overview(user.sub);
  }
  @Get('activity') activity(
    @CurrentUser() user: JwtPayload,
    @Query() query: GrowthActivityQueryDto,
  ) {
    return this.growth.activity(user.sub, query.cursor, query.limit);
  }
  @Get('journal') journal(
    @CurrentUser() user: JwtPayload,
    @Query('goalId') goalId?: string,
  ) {
    return this.growth.journal(user.sub, goalId);
  }
  @Post('journal') createJournal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGrowthJournalDto,
  ) {
    return this.growth.createJournal(user.sub, dto);
  }
  @Get('preferences') preferences(@CurrentUser() user: JwtPayload) {
    return this.growth.getPreferences(user.sub);
  }
  @Patch('preferences') preferencesUpdate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateGrowthPreferencesDto,
  ) {
    return this.growth.updatePreferences(user.sub, dto);
  }
  @Post('paths/enroll') enroll(
    @CurrentUser() user: JwtPayload,
    @Body() dto: EnrollGrowthPathDto,
  ) {
    return this.growth.enrollPath(user.sub, dto.pathKey);
  }
  @Get('export') exportData(@CurrentUser() user: JwtPayload) {
    return this.growth.exportData(user.sub);
  }
  @Delete('data') deleteData(@CurrentUser() user: JwtPayload) {
    return this.growth.deleteData(user.sub);
  }

  @Post('goals') createGoal(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGrowthGoalDto,
  ) {
    return this.growth.createGoal(user.sub, dto);
  }
  @Get('goals/:goalId') goal(
    @CurrentUser() user: JwtPayload,
    @Param('goalId') id: string,
  ) {
    return this.growth.goal(user.sub, id);
  }
  @Patch('goals/:goalId') updateGoal(
    @CurrentUser() user: JwtPayload,
    @Param('goalId') id: string,
    @Body() dto: UpdateGrowthGoalDto,
  ) {
    return this.growth.updateGoal(user.sub, id, dto);
  }
  @Patch('goals/:goalId/progress') progress(
    @CurrentUser() user: JwtPayload,
    @Param('goalId') id: string,
    @Body() dto: UpdateGrowthProgressDto,
  ) {
    return this.growth.updateProgress(
      user.sub,
      id,
      dto.completedSteps,
      dto.version,
    );
  }
  @Post('goals/:goalId/accept') accept(
    @CurrentUser() user: JwtPayload,
    @Param('goalId') id: string,
  ) {
    return this.growth.acceptSuggestion(user.sub, id);
  }
  @Delete('goals/:goalId') archive(
    @CurrentUser() user: JwtPayload,
    @Param('goalId') id: string,
  ) {
    return this.growth.archiveGoal(user.sub, id);
  }
  @Post('exercises/:exerciseId/complete') completeExercise(
    @CurrentUser() user: JwtPayload,
    @Param('exerciseId') id: string,
    @Body() dto: CompleteGrowthExerciseDto,
  ) {
    return this.growth.completeExercise(user.sub, id, dto.note);
  }
  @Post('check-ins') checkIn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertGrowthCheckInDto,
  ) {
    return this.growth.checkIn(user.sub, dto);
  }
}
