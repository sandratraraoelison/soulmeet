import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GuidanceController } from './guidance.controller';
import { GuidancePromptService } from './guidance-prompt.service';
import { GuidanceService } from './guidance.service';
import { LlmModule } from '../llm/llm.module';
import { SoulprintModule } from '../soulprint/soulprint.module';

@Module({
  imports: [AuthModule, LlmModule, SoulprintModule],
  controllers: [GuidanceController],
  providers: [
    GuidanceService,
    GuidancePromptService,
  ],
})
export class GuidanceModule {}
