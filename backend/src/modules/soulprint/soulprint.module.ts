import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { SoulprintController } from './soulprint.controller';
import { SoulprintContextService } from './services/soulprint-context.service';
import { SoulprintExtractionService } from './services/soulprint-extraction.service';
import { SoulprintExtractionQueueService } from './services/soulprint-extraction-queue.service';
import { SoulprintMatchingAdapterService } from './services/soulprint-matching-adapter.service';
import { SoulprintMergeService } from './services/soulprint-merge.service';
import { SoulprintService } from './services/soulprint.service';
import { SoulprintSummaryService } from './services/soulprint-summary.service';
import { SoulprintConsentService } from './services/soulprint-consent.service';
import { PeerConversationAnalysisService } from './services/peer-conversation-analysis.service';
@Module({
  imports: [AuthModule, LlmModule], controllers: [SoulprintController],
  providers: [SoulprintService, SoulprintMergeService, SoulprintSummaryService, SoulprintContextService, SoulprintExtractionService, SoulprintExtractionQueueService, SoulprintMatchingAdapterService, SoulprintConsentService, PeerConversationAnalysisService],
  exports: [SoulprintService, SoulprintContextService, SoulprintExtractionService, SoulprintExtractionQueueService, SoulprintMatchingAdapterService, SoulprintConsentService, PeerConversationAnalysisService],
})
export class SoulprintModule {}
