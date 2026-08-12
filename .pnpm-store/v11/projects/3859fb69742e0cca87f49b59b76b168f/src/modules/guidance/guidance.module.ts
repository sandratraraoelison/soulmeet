import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GuidanceController } from './guidance.controller';
import { GuidancePromptService } from './guidance-prompt.service';
import { GuidanceService } from './guidance.service';
import { LlmModule } from '../llm/llm.module';
import { SoulprintModule } from '../soulprint/soulprint.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DailyCoachCheckInService } from './daily-coach-check-in.service';

@Module({
  imports: [AuthModule, LlmModule, SoulprintModule, NotificationsModule],
  controllers: [GuidanceController],
  providers: [
    GuidanceService,
    GuidancePromptService,
    DailyCoachCheckInService,
  ],
})
export class GuidanceModule {}
