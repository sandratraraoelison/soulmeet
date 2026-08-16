import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface LlmUsageRecord {
  userId?: string;
  feature: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
}

/** Approximates tokens from characters; providers do not always expose usage. */
export function estimateTokens(text: string): number {
  return text ? Math.max(1, Math.round(text.length / 4)) : 0;
}

@Injectable()
export class LlmUsageService {
  private readonly logger = new Logger(LlmUsageService.name);
  constructor(private readonly prisma: PrismaService) {}

  async record(record: LlmUsageRecord): Promise<void> {
    try {
      const data: Prisma.LlmUsageUncheckedCreateInput = {
        userId: record.userId,
        feature: record.feature,
        provider: record.provider,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        cachedTokens: record.cachedTokens ?? 0,
        latencyMs: record.latencyMs,
        success: record.success,
        errorCode: record.errorCode,
      };
      await this.prisma.llmUsage.create({ data });
    } catch (error) {
      // Telemetry must never break the underlying LLM call.
      this.logger.warn(`Failed to record LlmUsage: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
