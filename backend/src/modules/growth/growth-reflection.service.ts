import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateGrowthJournalDto,
  UpsertGrowthCheckInDto,
} from './dto/growth.dto';

@Injectable()
export class GrowthReflectionService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(userId: string, dto: UpsertGrowthCheckInDto, weekKey: string) {
    const item = await this.prisma.growthCheckIn.upsert({
      where: { userId_weekKey: { userId, weekKey } },
      create: { userId, weekKey, mood: dto.mood, reflection: dto.reflection },
      update: { mood: dto.mood, reflection: dto.reflection },
    });
    await this.prisma.growthEvent.create({
      data: {
        userId,
        entityType: 'CHECK_IN',
        entityId: item.id,
        type: 'CHECK_IN',
        title: `Weekly check-in · ${dto.mood}/5`,
      },
    });
    return item;
  }

  createJournal(userId: string, dto: CreateGrowthJournalDto) {
    return this.prisma.growthJournalEntry.create({
      data: {
        userId,
        goalId: dto.goalId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  journal(userId: string, goalId?: string) {
    return this.prisma.growthJournalEntry.findMany({
      where: { userId, goalId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  activity(userId: string, cursor?: string, limit = 20) {
    return this.prisma.growthEvent
      .findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })
      .then((rows) => {
        const page = rows.slice(0, limit);
        return {
          entries: page,
          nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
        };
      });
  }
}
