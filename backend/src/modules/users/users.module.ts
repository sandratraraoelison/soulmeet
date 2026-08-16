import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LlmModule } from '../llm/llm.module';
import { SemanticMatchService } from './semantic-match.service';
import { MatchCandidatesService } from './match-candidates.service';
import { MatchPersistenceService } from './match-persistence.service';
@Module({
  imports: [JwtModule.register({}), LlmModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    SemanticMatchService,
    MatchCandidatesService,
    MatchPersistenceService,
    JwtAuthGuard,
  ],
  exports: [UsersService],
})
export class UsersModule {}
