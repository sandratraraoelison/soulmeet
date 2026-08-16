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
import { EXERCISE_TEMPLATES, GROWTH_PATHS } from './growth.constants';
import { GrowthGoalsService } from './growth-goals.service';
import { GrowthReflectionService } from './growth-reflection.service';

@Injectable()
export class GrowthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goals: GrowthGoalsService,
    private readonly reflections: GrowthReflectionService,
  ) {}

  async overview(userId: string) {
    const preference = await this.preference(userId);
    await this.goals.ensureSuggestion(userId);
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
      paths: GROWTH_PATHS.map((path) => ({
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
    return this.goals.createGoal(userId, dto);
  }
  async updateProgress(
    userId: string,
    id: string,
    completedSteps: number,
    version: number,
  ) {
    return this.goals.updateProgress(userId, id, completedSteps, version);
  }
  async updateGoal(userId: string, id: string, dto: UpdateGrowthGoalDto) {
    return this.goals.updateGoal(userId, id, dto);
  }
  async acceptSuggestion(userId: string, id: string) {
    return this.goals.acceptSuggestion(userId, id);
  }
  async archiveGoal(userId: string, id: string) {
    return this.goals.archiveGoal(userId, id);
  }
  goal(userId: string, id: string) {
    return this.goals.goal(userId, id);
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
    return this.reflections.checkIn(userId, dto, weekKey);
  }
  createJournal(userId: string, dto: CreateGrowthJournalDto) {
    return this.reflections.createJournal(userId, dto);
  }
  journal(userId: string, goalId?: string) {
    return this.reflections.journal(userId, goalId);
  }
  activity(userId: string, cursor?: string, limit = 20) {
    return this.reflections.activity(userId, cursor, limit);
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
    const path = GROWTH_PATHS.find((item) => item.key === pathKey);
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

  private async preference(userId: string) {
    return this.prisma.growthPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
  private async ensureTodayExercise(userId: string, timezone: string) {
    const dayKey = this.dayKey(new Date(), timezone);
    const goal = await this.prisma.growthGoal.findFirst({
      where: { userId, status: GrowthGoalStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
    });
    const seed = [...dayKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    let template = EXERCISE_TEMPLATES[seed % EXERCISE_TEMPLATES.length]!;
    if (goal) {
      const text = `${goal.title} ${goal.description ?? ''}`.toLowerCase();
      template = text.includes('communicat')
        ? EXERCISE_TEMPLATES[4]!
        : text.includes('confiden') || text.includes('nervous')
          ? EXERCISE_TEMPLATES[0]!
          : text.includes('boundar')
            ? EXERCISE_TEMPLATES[2]!
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
    return `${value.getUTCFullYear()}-W${String(
      Math.ceil(((value.getTime() - start.getTime()) / 86_400_000 + 1) / 7),
    ).padStart(2, '0')}`;
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
