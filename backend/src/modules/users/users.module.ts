import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LlmModule } from '../llm/llm.module';
import { SemanticMatchService } from './semantic-match.service';
import { MatchCandidatesService } from './match-candidates.service';
import { MatchPersistenceService } from './match-persistence.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchmakingSearchService } from './matchmaking-search.service';
import { ChatModule } from '../chat/chat.module';
@Module({
  imports: [JwtModule.register({}), LlmModule, NotificationsModule, ChatModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    SemanticMatchService,
    MatchCandidatesService,
    MatchPersistenceService,
    MatchmakingSearchService,
    JwtAuthGuard,
  ],
  exports: [UsersService],
})
export class UsersModule {}
