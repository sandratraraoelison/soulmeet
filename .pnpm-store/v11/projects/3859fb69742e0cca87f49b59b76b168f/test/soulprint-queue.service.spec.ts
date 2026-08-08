import { ConfigService } from '@nestjs/config';
import { SoulprintExtractionJobStatus } from '@prisma/client';
import { SoulprintException } from '../src/modules/soulprint/soulprint.exception';
import { SoulprintExtractionQueueService } from '../src/modules/soulprint/services/soulprint-extraction-queue.service';

describe('SoulprintExtractionQueueService', () => {
  it('persists and coalesces extraction requests per user', async () => {
    const prisma = { soulprintExtractionJob: { upsert: jest.fn().mockResolvedValue({}) } };
    const queue = new SoulprintExtractionQueueService(prisma as never, new ConfigService({ SOULPRINT_EXTRACTION_ENABLED: true, SOULPRINT_EXTRACTION_DEBOUNCE_SECONDS: 2 }), {} as never);
    await queue.enqueue('user-id', 'conversation-id');
    expect(prisma.soulprintExtractionJob.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-id' },
      create: expect.objectContaining({ conversationId: 'conversation-id' }),
      update: expect.objectContaining({ status: SoulprintExtractionJobStatus.PENDING, attempts: 0 }),
    }));
  });

  it('retries failures with exponential backoff and records a metric', async () => {
    const prisma = {
      soulprintExtractionJob: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      soulprintExtractionMetric: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const extraction = { extract: jest.fn().mockRejectedValue(new SoulprintException('LLM_UNAVAILABLE', 'Unavailable')) };
    const queue = new SoulprintExtractionQueueService(prisma as never, new ConfigService({ SOULPRINT_JOB_MAX_ATTEMPTS: 5, SOULPRINT_JOB_BACKOFF_BASE_MS: 1000 }), extraction as never);
    await (queue as any).process('job-id', 'user-id', 'conversation-id', 2);
    expect(prisma.soulprintExtractionJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: SoulprintExtractionJobStatus.PENDING, lastErrorCode: 'LLM_UNAVAILABLE' }),
    }));
    expect(prisma.soulprintExtractionMetric.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { outcome_code: { outcome: 'retry', code: 'LLM_UNAVAILABLE' } },
    }));
  });
});
