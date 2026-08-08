import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GrowthGoalStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateGrowthGoalDto,
  CreateGrowthJournalDto,
  UpdateGrowthGoalDto,
  UpdateGrowthPreferencesDto,
  UpsertGrowthCheckInDto,
} from './dto/growth.dto';

const paths = [
  {
    key: 'confidence',
    title: 'Build confidence',
    description: 'Small social steps that strengthen self-trust.',
    units: 5,
  },
  {
    key: 'communication',
    title: 'Communicate clearly',
    description: 'Express needs, curiosity, and boundaries with care.',
    units: 5,
  },
  {
    key: 'rejection',
    title: 'Navigate rejection',
    description: 'Meet uncertainty without tying it to your worth.',
    units: 5,
  },
  {
    key: 'healthy-relationships',
    title: 'Healthy relationships',
    description: 'Recognize mutuality, safety, and compatibility.',
    units: 5,
  },
];
const exerciseTemplates = [
  {
    kind: 'CONFIDENCE',
    title: 'Three conversation starters',
    description:
      'Write three natural questions you could use to start a meaningful conversation.',
    durationMin: 5,
  },
  {
    kind: 'REFLECTION',
    title: 'Name what you need',
    description:
      'Write one emotional need you would like to communicate more clearly.',
    durationMin: 5,
  },
  {
    kind: 'BOUNDARY',
    title: 'Practice a gentle boundary',
    description:
      'Draft one respectful sentence that protects your time, energy, or comfort.',
    durationMin: 7,
  },
  {
    kind: 'STRENGTH',
    title: 'Notice a recent win',
    description:
      'Describe one small social moment you handled well and what helped you.',
    durationMin: 5,
  },
  {
    kind: 'COMMUNICATION',
    title: 'Reframe one assumption',
    description:
      'Take one worried thought and write a calmer, more balanced alternative.',
    durationMin: 7,
  },
];

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const preference = await this.preference(userId);
    await this.ensureSuggestion(userId);
    const todayExercise = await this.ensureTodayExercise(
      userId,
      preference.timezone,
    );
    const weekKey = this.weekKey(new Date(), preference.timezone);
    const [
      activeGoals,
      suggestedGoals,
      weeklyCheckIn,
      recentActivity,
      enrollments,
      checkIns,
    ] = await Promise.all([
      this.prisma.growthGoal.findMany({
        where: {
          userId,
          status: { in: [GrowthGoalStatus.ACTIVE, GrowthGoalStatus.PAUSED] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
      }),
      this.prisma.growthGoal.findMany({
        where: { userId, status: GrowthGoalStatus.SUGGESTED },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      this.prisma.growthCheckIn.findUnique({
        where: { userId_weekKey: { userId, weekKey } },
      }),
      this.prisma.growthEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.growthPathEnrollment.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.growthCheckIn.findMany({
        where: { userId },
        orderBy: { updatedAt: 'asc' },
        take: 12,
        select: { id: true, mood: true, updatedAt: true },
      }),
    ]);
    return {
      activeGoals,
      suggestedGoals,
      todayExercise,
      weeklyCheckIn,
      recentActivity,
      paths: paths.map((path) => ({
        ...path,
        enrollment:
          enrollments.find((item) => item.pathKey === path.key) ?? null,
      })),
      moodTrend: checkIns,
      preferences: preference,
      streak: preference.gentleStreaks
        ? await this.streak(userId, preference.timezone)
        : null,
    };
  }

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

  async completeExercise(userId: string, id: string, note?: string) {
    const item = await this.prisma.growthExercise.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Growth exercise not found');
    if (item.completedAt) return item;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.growthExercise.update({
        where: { id },
        data: { completedAt: new Date(), note },
      });
      await tx.growthEvent.create({
        data: {
          userId,
          entityType: 'EXERCISE',
          entityId: id,
          type: 'EXERCISE_COMPLETED',
          title: item.title,
        },
      });
      if (item.goalId)
        await tx.growthGoal
          .update({
            where: { id: item.goalId },
            data: {
              completedSteps: { increment: 1 },
              version: { increment: 1 },
            },
          })
          .catch(() => undefined);
      return updated;
    });
  }

  async checkIn(userId: string, dto: UpsertGrowthCheckInDto) {
    const pref = await this.preference(userId);
    const weekKey = this.weekKey(new Date(), pref.timezone);
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
  getPreferences(userId: string) {
    return this.preference(userId);
  }
  async updatePreferences(userId: string, dto: UpdateGrowthPreferencesDto) {
    this.validateTimezone(dto.timezone);
    return this.prisma.growthPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }
  async enrollPath(userId: string, pathKey: string) {
    const path = paths.find((item) => item.key === pathKey);
    if (!path) throw new NotFoundException('Growth path not found');
    return this.prisma.growthPathEnrollment.upsert({
      where: { userId_pathKey: { userId, pathKey } },
      create: { userId, pathKey, title: path.title, totalUnits: path.units },
      update: {},
    });
  }
  async exportData(userId: string) {
    const [goals, exercises, checkIns, journal, pathsData, preferences] =
      await Promise.all([
        this.prisma.growthGoal.findMany({ where: { userId } }),
        this.prisma.growthExercise.findMany({ where: { userId } }),
        this.prisma.growthCheckIn.findMany({ where: { userId } }),
        this.prisma.growthJournalEntry.findMany({ where: { userId } }),
        this.prisma.growthPathEnrollment.findMany({ where: { userId } }),
        this.preference(userId),
      ]);
    return {
      exportedAt: new Date(),
      goals,
      exercises,
      checkIns,
      journal,
      paths: pathsData,
      preferences,
    };
  }
  deleteData(userId: string) {
    return this.prisma.$transaction([
      this.prisma.growthEvent.deleteMany({ where: { userId } }),
      this.prisma.growthJournalEntry.deleteMany({ where: { userId } }),
      this.prisma.growthExercise.deleteMany({ where: { userId } }),
      this.prisma.growthCheckIn.deleteMany({ where: { userId } }),
      this.prisma.growthGoal.deleteMany({ where: { userId } }),
      this.prisma.growthPathEnrollment.deleteMany({ where: { userId } }),
      this.prisma.growthPreference.deleteMany({ where: { userId } }),
    ]);
  }
  goal(userId: string, id: string) {
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

  private async preference(userId: string) {
    return this.prisma.growthPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
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
  private async ensureSuggestion(userId: string) {
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
    await this.prisma.growthGoal.create({
      data: {
        userId,
        title: `Work gently on ${insight.key || insight.category.toLowerCase().replaceAll('_', ' ')}`,
        description: `Suggested from a confirmed Soulprint insight: ${insight.value}`,
        status: GrowthGoalStatus.SUGGESTED,
        source: 'SOULPRINT',
        targetSteps: 5,
      },
    });
  }
  private async ensureTodayExercise(userId: string, timezone: string) {
    const dayKey = this.dayKey(new Date(), timezone);
    const goal = await this.prisma.growthGoal.findFirst({
      where: { userId, status: GrowthGoalStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
    });
    const seed = [...dayKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    let template = exerciseTemplates[seed % exerciseTemplates.length]!;
    if (goal) {
      const text = `${goal.title} ${goal.description ?? ''}`.toLowerCase();
      template = text.includes('communicat')
        ? exerciseTemplates[4]!
        : text.includes('confiden') || text.includes('nervous')
          ? exerciseTemplates[0]!
          : text.includes('boundar')
            ? exerciseTemplates[2]!
            : template;
    }
    return this.prisma.growthExercise.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      create: { userId, dayKey, goalId: goal?.id, ...template },
      update: {},
    });
  }
  private dayKey(date: Date, timezone: string) {
    this.validateTimezone(timezone);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
  private weekKey(date: Date, timezone: string) {
    const [year, month, day] = this.dayKey(date, timezone)
      .split('-')
      .map(Number);
    const value = new Date(Date.UTC(year!, month! - 1, day!));
    value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
    const start = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
    return `${value.getUTCFullYear()}-W${String(Math.ceil(((value.getTime() - start.getTime()) / 86_400_000 + 1) / 7)).padStart(2, '0')}`;
  }
  private validateTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    } catch {
      throw new ConflictException('Invalid timezone');
    }
  }
  private async streak(userId: string, timezone: string) {
    const events = await this.prisma.growthEvent.findMany({
      where: {
        userId,
        type: {
          in: [
            'EXERCISE_COMPLETED',
            'CHECK_IN',
            'GOAL_PROGRESS',
            'GOAL_COMPLETED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { createdAt: true },
    });
    const days = new Set(
      events.map((item) => this.dayKey(item.createdAt, timezone)),
    );
    let count = 0;
    const cursor = new Date();
    while (days.has(this.dayKey(cursor, timezone))) {
      count++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return count;
  }
}
