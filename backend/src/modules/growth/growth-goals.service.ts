import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GrowthGoalStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateGrowthGoalDto,
  UpdateGrowthGoalDto,
} from './dto/growth.dto';

@Injectable()
export class GrowthGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGoal(userId: string, dto: CreateGrowthGoalDto) {
    await this.assertGoalCapacity(userId);
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.growthGoal.create({
        data: {
          userId,
          title: dto.title,
          description: dto.description,
          targetSteps: dto.targetSteps,
          targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        },
      });
      await tx.growthEvent.create({
        data: {
          userId,
          entityType: 'GOAL',
          entityId: goal.id,
          type: 'GOAL_CREATED',
          title: goal.title,
        },
      });
      return goal;
    });
  }

  async updateProgress(
    userId: string,
    id: string,
    completedSteps: number,
    version: number,
  ) {
    const goal = await this.ownedGoal(userId, id);
    const steps = Math.min(completedSteps, goal.targetSteps);
    const completing = steps === goal.targetSteps;
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.growthGoal.updateMany({
        where: { id, userId, version },
        data: {
          completedSteps: steps,
          version: { increment: 1 },
          ...(completing
            ? { status: GrowthGoalStatus.COMPLETED, completedAt: new Date() }
            : {}),
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'This goal changed on another device. Refresh and try again.',
        );
      const updated = await tx.growthGoal.findUniqueOrThrow({ where: { id } });
      await tx.growthEvent.create({
        data: {
          userId,
          entityType: 'GOAL',
          entityId: id,
          type: completing ? 'GOAL_COMPLETED' : 'GOAL_PROGRESS',
          title: completing ? goal.title : `Progressed: ${goal.title}`,
          metadata: { completedSteps: steps, targetSteps: goal.targetSteps },
        },
      });
      return updated;
    });
  }

  async updateGoal(userId: string, id: string, dto: UpdateGrowthGoalDto) {
    await this.ownedGoal(userId, id);
    const changed = await this.prisma.growthGoal.updateMany({
      where: { id, userId, version: dto.version },
      data: {
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status,
        version: { increment: 1 },
      },
    });
    if (!changed.count)
      throw new ConflictException('This goal changed on another device.');
    return this.prisma.growthGoal.findUniqueOrThrow({ where: { id } });
  }

  async acceptSuggestion(userId: string, id: string) {
    await this.assertGoalCapacity(userId);
    const goal = await this.ownedGoal(userId, id);
    if (goal.status !== GrowthGoalStatus.SUGGESTED)
      throw new ConflictException('Suggestion already reviewed');
    return this.prisma.growthGoal.update({
      where: { id },
      data: { status: GrowthGoalStatus.ACTIVE, version: { increment: 1 } },
    });
  }

  async archiveGoal(userId: string, id: string) {
    const goal = await this.ownedGoal(userId, id);
    await this.prisma.growthEvent.create({
      data: {
        userId,
        entityType: 'GOAL',
        entityId: id,
        type: 'GOAL_ARCHIVED',
        title: goal.title,
      },
    });
    return this.prisma.growthGoal.update({
      where: { id },
      data: { status: GrowthGoalStatus.ARCHIVED, version: { increment: 1 } },
    });
  }

  async goal(userId: string, id: string) {
    return this.prisma.growthGoal
      .findFirst({
        where: { id, userId },
        include: {
          exercises: { orderBy: { createdAt: 'desc' } },
          journalEntries: { orderBy: { createdAt: 'desc' } },
        },
      })
      .then((item) => {
        if (!item) throw new NotFoundException('Growth goal not found');
        return item;
      });
  }

  async ensureSuggestion(userId: string) {
    const existing = await this.prisma.growthGoal.count({
      where: { userId, status: GrowthGoalStatus.SUGGESTED },
    });
    if (existing) return;
    const insight = await this.prisma.soulprintEntry.findFirst({
      where: {
        soulprint: { userId },
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        category: {
          in: [
            'CHALLENGE',
            'EMOTIONAL_NEED',
            'COMMUNICATION_STYLE',
            'BOUNDARY',
          ],
        },
      },
      orderBy: { importance: 'desc' },
    });
    if (!insight) return;
    const description = `Suggested from a confirmed Soulprint insight: ${insight.value}`;
    const alreadyReviewed = await this.prisma.growthGoal.findFirst({
      where: { userId, source: 'SOULPRINT', description },
      select: { id: true },
    });
    if (alreadyReviewed) return;
    await this.prisma.growthGoal.create({
      data: {
        userId,
        title: `Work gently on ${
          insight.key || insight.category.toLowerCase().replaceAll('_', ' ')
        }`,
        description,
        status: GrowthGoalStatus.SUGGESTED,
        source: 'SOULPRINT',
        targetSteps: 5,
      },
    });
  }

  private async assertGoalCapacity(userId: string) {
    const count = await this.prisma.growthGoal.count({
      where: {
        userId,
        status: { in: [GrowthGoalStatus.ACTIVE, GrowthGoalStatus.PAUSED] },
      },
    });
    if (count >= 3)
      throw new ConflictException(
        'You can have up to three active goals. Pause or archive one first.',
      );
  }

  private async ownedGoal(userId: string, id: string) {
    const goal = await this.prisma.growthGoal.findFirst({
      where: { id, userId },
    });
    if (!goal) throw new NotFoundException('Growth goal not found');
    return goal;
  }
}
