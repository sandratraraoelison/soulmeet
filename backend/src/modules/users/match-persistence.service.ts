import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface MatchResultToPersist {
  userId: string;
  score: number;
  scoreMin: number;
  scoreMax: number;
  reciprocalScore: number;
  reciprocalScoreMin: number;
  reasons: string[];
  semanticScore?: number;
  semanticConfidence?: number;
  semanticModel?: string;
  semanticAnalysis?: unknown;
}

/**
 * Best-effort persistence of match recommendations. Persistence must never
 * fail the matching request, so failures are logged and swallowed.
 */
@Injectable()
export class MatchPersistenceService {
  private readonly logger = new Logger(MatchPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persist(userId: string, results: MatchResultToPersist[]): Promise<void> {
    try {
      for (const result of results) {
        await this.prisma.match.upsert({
          where: {
            userId_matchedUserId: {
              userId,
              matchedUserId: result.userId,
            },
          },
          create: {
            userId,
            matchedUserId: result.userId,
            score: result.score,
            scoreMin: result.scoreMin,
            scoreMax: result.scoreMax,
            reciprocalScore: result.reciprocalScore,
            reciprocalScoreMin: result.reciprocalScoreMin,
            reasons: result.reasons as never,
            semanticScore: result.semanticScore,
            semanticConfidence: result.semanticConfidence,
            semanticModel: result.semanticModel,
            semanticAnalysis: result.semanticAnalysis as never,
          },
          update: {
            score: result.score,
            scoreMin: result.scoreMin,
            scoreMax: result.scoreMax,
            reciprocalScore: result.reciprocalScore,
            reciprocalScoreMin: result.reciprocalScoreMin,
            reasons: result.reasons as never,
            semanticScore: result.semanticScore,
            semanticConfidence: result.semanticConfidence,
            semanticModel: result.semanticModel,
            semanticAnalysis: result.semanticAnalysis as never,
          },
        });
      }
    } catch (error) {
      this.logger.warn(
        `Failed to persist matches for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
