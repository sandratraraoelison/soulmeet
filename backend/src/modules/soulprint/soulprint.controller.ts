import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ConfirmSoulprintEntryDto, CreateSoulprintEntryDto, SoulprintEntriesQueryDto, SoulprintHistoryQueryDto, UpdateSoulprintEntryDto, UpdateSoulprintVisibilityDto } from './dto/soulprint.dto';
import { SoulprintException } from './soulprint.exception';
import { SoulprintExtractionService } from './services/soulprint-extraction.service';
import { SoulprintExtractionQueueService } from './services/soulprint-extraction-queue.service';
import { SoulprintService } from './services/soulprint.service';

@ApiTags('soulprint') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('soulprint')
/** Authenticated HTTP boundary; ownership always comes from the JWT subject. */
export class SoulprintController {
  constructor(private readonly soulprint: SoulprintService, private readonly extraction: SoulprintExtractionService, private readonly queue: SoulprintExtractionQueueService, private readonly config: ConfigService) {}
  @Get() get(@CurrentUser() user: JwtPayload) { return this.soulprint.get(user.sub); }
  @Get('summary') summary(@CurrentUser() user: JwtPayload) { return this.soulprint.summary(user.sub); }
  @Get('entries') entries(@CurrentUser() user: JwtPayload, @Query() query: SoulprintEntriesQueryDto) { return this.soulprint.entries(user.sub, query); }
  @Get('entries/:entryId') entry(@CurrentUser() user: JwtPayload, @Param('entryId') id: string) { return this.soulprint.entry(user.sub, id); }
  @Post('entries') create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSoulprintEntryDto) { return this.soulprint.createEntry(user.sub, dto); }
  @Patch('entries/:entryId') update(@CurrentUser() user: JwtPayload, @Param('entryId') id: string, @Body() dto: UpdateSoulprintEntryDto) { return this.soulprint.updateEntry(user.sub, id, dto); }
  @Delete('entries/:entryId') delete(@CurrentUser() user: JwtPayload, @Param('entryId') id: string) { return this.soulprint.delete(user.sub, id); }
  @Post('entries/:entryId/confirm') confirm(@CurrentUser() user: JwtPayload, @Param('entryId') id: string, @Body() dto: ConfirmSoulprintEntryDto) { return this.soulprint.confirm(user.sub, id, dto.correctedValue); }
  @Post('entries/:entryId/reject') reject(@CurrentUser() user: JwtPayload, @Param('entryId') id: string) { return this.soulprint.reject(user.sub, id); }
  @Patch('entries/:entryId/visibility') visibility(@CurrentUser() user: JwtPayload, @Param('entryId') id: string, @Body() dto: UpdateSoulprintVisibilityDto) { return this.soulprint.visibility(user.sub, id, dto.visibility); }
  @Get('pending') pending(@CurrentUser() user: JwtPayload, @Query() query: SoulprintEntriesQueryDto) { return this.soulprint.pending(user.sub, query); }
  @Get('history') history(@CurrentUser() user: JwtPayload, @Query() query: SoulprintHistoryQueryDto) { return this.soulprint.history(user.sub, query.cursor, query.limit); }
  @Get('extraction-status') extractionStatus(@CurrentUser() user: JwtPayload) { return this.queue.status(user.sub); }
  @Get('extraction-metrics') extractionMetrics(@CurrentUser() user: JwtPayload) {
    // Aggregate provider/worker telemetry can expose operational details and is
    // therefore restricted independently of ordinary Soulprint ownership.
    if (user.role !== 'ADMIN') throw new SoulprintException('SOULPRINT_ACCESS_DENIED', 'Extraction metrics require an administrator');
    return this.queue.metrics();
  }
  @Post('recalculate') recalculate(@CurrentUser() user: JwtPayload) { return this.soulprint.recalculate(user.sub); }
  @Post('extract') extract(@CurrentUser() user: JwtPayload) {
    // Production users rely on the background queue. Manual execution remains
    // available to administrators for recovery and diagnostics.
    if (this.config.get('NODE_ENV') === 'production' && user.role !== 'ADMIN') throw new SoulprintException('SOULPRINT_ACCESS_DENIED', 'Manual extraction is not available');
    return this.extraction.extract(user.sub, undefined, true);
  }
}
