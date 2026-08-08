import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SoulprintExtractionJobStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SoulprintException } from '../soulprint.exception';
import { SoulprintExtractionService } from './soulprint-extraction.service';

@Injectable()
export class SoulprintExtractionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SoulprintExtractionQueueService.name);
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly extraction: SoulprintExtractionService,
  ) {}

  async onModuleInit() {
    if (!this.config.get<boolean>('SOULPRINT_EXTRACTION_ENABLED', true)) return;
    const staleBefore = new Date(Date.now() - this.config.get<number>('SOULPRINT_JOB_STALE_MS', 300_000));
    await this.prisma.soulprintExtractionJob.updateMany({
      where: { status: SoulprintExtractionJobStatus.RUNNING, lockedAt: { lt: staleBefore } },
      data: { status: SoulprintExtractionJobStatus.PENDING, lockedAt: null, runAt: new Date(), lastErrorCode: 'STALE_JOB_RECOVERED' },
    });
    await this.resumeUnprocessed();
    const interval = this.config.get<number>('SOULPRINT_JOB_POLL_INTERVAL_MS', 2_000);
    this.timer = setInterval(() => void this.poll(), interval);
    void this.poll();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(userId: string, conversationId?: string) {
    if (!this.config.get<boolean>('SOULPRINT_EXTRACTION_ENABLED', true)) return;
    const delay = this.config.get<number>('SOULPRINT_EXTRACTION_DEBOUNCE_SECONDS', 2) * 1_000;
    await this.prisma.soulprintExtractionJob.upsert({
      where: { userId },
      create: { userId, conversationId, runAt: new Date(Date.now() + delay) },
      update: { conversationId, status: SoulprintExtractionJobStatus.PENDING, attempts: 0, runAt: new Date(Date.now() + delay), lockedAt: null, completedAt: null, lastErrorCode: null },
    });
  }

  async status(userId: string) {
    const job = await this.prisma.soulprintExtractionJob.findUnique({ where: { userId } });
    return job ? { status: job.status, attempts: job.attempts, runAt: job.runAt, completedAt: job.completedAt, lastErrorCode: job.lastErrorCode } : { status: 'IDLE', attempts: 0 };
  }

  async metrics() {
    const rows = await this.prisma.soulprintExtractionMetric.findMany({ orderBy: [{ outcome: 'asc' }, { code: 'asc' }] });
    return rows.map((row) => ({ ...row, totalDurationMs: Number(row.totalDurationMs), averageDurationMs: row.count ? Math.round(Number(row.totalDurationMs) / row.count) : 0 }));
  }

  private async resumeUnprocessed() {
    const souls = await this.prisma.soulprint.findMany({ select: { userId: true, lastAnalyzedMessageId: true } });
    for (const soul of souls) {
      const latest = await this.prisma.guidanceMessage.findFirst({ where: { conversation: { userId: soul.userId }, role: 'USER', isDeleted: false }, orderBy: { createdAt: 'desc' }, select: { id: true, conversationId: true } });
      if (latest && latest.id !== soul.lastAnalyzedMessageId) await this.enqueue(soul.userId, latest.conversationId);
    }
  }

  private async poll() {
    if (this.polling) return;
    this.polling = true;
    try {
      const job = await this.prisma.soulprintExtractionJob.findFirst({ where: { status: SoulprintExtractionJobStatus.PENDING, runAt: { lte: new Date() } }, orderBy: { runAt: 'asc' } });
      if (!job) return;
      const claimed = await this.prisma.soulprintExtractionJob.updateMany({ where: { id: job.id, status: SoulprintExtractionJobStatus.PENDING }, data: { status: SoulprintExtractionJobStatus.RUNNING, lockedAt: new Date(), attempts: { increment: 1 } } });
      if (!claimed.count) return;
      await this.process(job.id, job.userId, job.conversationId ?? undefined, job.attempts + 1);
    } finally {
      this.polling = false;
    }
  }

  private async process(id: string, userId: string, conversationId: string | undefined, attempt: number) {
    const started = Date.now();
    try {
      // Process every unanalysed Guidance message for the user. The stored
      // conversation id is diagnostic context; coalesced jobs may span chats.
      await this.extraction.extract(userId);
      await this.prisma.soulprintExtractionJob.updateMany({ where: { id, status: SoulprintExtractionJobStatus.RUNNING }, data: { status: SoulprintExtractionJobStatus.SUCCEEDED, lockedAt: null, completedAt: new Date(), lastErrorCode: null } });
      await this.recordMetric('success', 'OK', Date.now() - started);
    } catch (error) {
      const code = error instanceof SoulprintException ? error.code : 'SOULPRINT_EXTRACTION_FAILED';
      const max = this.config.get<number>('SOULPRINT_JOB_MAX_ATTEMPTS', 5);
      const retry = attempt < max;
      const base = this.config.get<number>('SOULPRINT_JOB_BACKOFF_BASE_MS', 5_000);
      await this.prisma.soulprintExtractionJob.updateMany({ where: { id, status: SoulprintExtractionJobStatus.RUNNING }, data: { status: retry ? SoulprintExtractionJobStatus.PENDING : SoulprintExtractionJobStatus.FAILED, runAt: new Date(Date.now() + base * 2 ** (attempt - 1)), lockedAt: null, completedAt: retry ? null : new Date(), lastErrorCode: code } });
      await this.recordMetric(retry ? 'retry' : 'failure', code, Date.now() - started);
      this.logger.warn({ userId, conversationId, code, attempt, retry });
    }
  }

  private async recordMetric(outcome: string, code: string, durationMs: number) {
    await this.prisma.soulprintExtractionMetric.upsert({
      where: { outcome_code: { outcome, code } },
      create: { outcome, code, count: 1, totalDurationMs: BigInt(durationMs) },
      update: { count: { increment: 1 }, totalDurationMs: { increment: BigInt(durationMs) }, lastOccurredAt: new Date() },
    }).catch(() => undefined);
  }
}
