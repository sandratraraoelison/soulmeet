import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CoachDailyCheckInStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { GuidanceService } from './guidance.service';

@Injectable()
export class DailyCoachCheckInService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyCoachCheckInService.name);
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly guidance: GuidanceService,
    private readonly notifications: PushNotificationsService,
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('DAILY_COACH_MESSAGES_ENABLED', true)) return;
    const interval = this.config.get<number>('DAILY_COACH_POLL_INTERVAL_MS', 300_000);
    this.timer = setInterval(() => void this.poll(), interval);
    void this.poll();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async poll(now = new Date()) {
    if (this.polling) return;
    this.polling = true;
    try {
      const preferences = await this.prisma.notificationPreference.findMany({
        where: { coachReflections: true, user: { isActive: true, coach: { isNot: null } } },
        select: { userId: true, timezone: true },
        take: 500,
      });
      const targetHour = this.config.get<number>('DAILY_COACH_MESSAGE_HOUR', 10);
      for (const preference of preferences) {
        const local = this.localTime(now, preference.timezone);
        if (local.hour !== targetHour) continue;
        await this.scheduleAndSend(preference.userId, local.dayKey, now);
      }
    } finally {
      this.polling = false;
    }
  }

  private async scheduleAndSend(userId: string, dayKey: string, now: Date) {
    const checkIn = await this.prisma.coachDailyCheckIn.upsert({
      where: { userId_dayKey: { userId, dayKey } },
      create: { userId, dayKey },
      update: {},
    });
    if (checkIn.status === CoachDailyCheckInStatus.SENT) return;
    const staleBefore = new Date(now.getTime() - 10 * 60_000);
    const maxAttempts = this.config.get<number>('DAILY_COACH_MAX_ATTEMPTS', 3);
    const claimed = await this.prisma.coachDailyCheckIn.updateMany({
      where: {
        id: checkIn.id,
        attempts: { lt: maxAttempts },
        OR: [
          { status: CoachDailyCheckInStatus.PENDING },
          { status: CoachDailyCheckInStatus.FAILED },
          { status: CoachDailyCheckInStatus.RUNNING, lockedAt: { lt: staleBefore } },
        ],
      },
      data: { status: CoachDailyCheckInStatus.RUNNING, attempts: { increment: 1 }, lockedAt: now, lastError: null },
    });
    if (!claimed.count) return;
    try {
      const { conversation, message } = await this.guidance.createDailyCoachMessage(userId, checkIn.id, dayKey);
      await this.notifications.send(userId, 'coachReflections', {
        title: 'Your coach is checking in',
        body: message.content ?? 'A new reflection is waiting for you.',
        data: { conversationId: conversation.id, type: 'coachReflection' },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Daily coach message failed';
      await this.prisma.coachDailyCheckIn.updateMany({
        where: { id: checkIn.id, status: CoachDailyCheckInStatus.RUNNING },
        data: { status: CoachDailyCheckInStatus.FAILED, lockedAt: null, lastError: reason.slice(0, 500) },
      });
      this.logger.warn({ userId, dayKey, reason });
    }
  }

  private localTime(date: Date, timezone: string) {
    let safeTimezone = timezone;
    try { new Intl.DateTimeFormat('en', { timeZone: safeTimezone }).format(date); }
    catch { safeTimezone = 'UTC'; }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    return { dayKey: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) };
  }
}
