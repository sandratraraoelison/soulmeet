import { CoachDailyCheckInStatus } from '@prisma/client';
import { DailyCoachCheckInService } from '../src/modules/guidance/daily-coach-check-in.service';

describe('DailyCoachCheckInService', () => {
  const now = new Date('2026-08-10T10:05:00.000Z');
  let prisma: any;
  let guidance: any;
  let notifications: any;
  let service: DailyCoachCheckInService;

  beforeEach(() => {
    prisma = {
      notificationPreference: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'user-a', timezone: 'UTC' }]),
      },
      coachDailyCheckIn: {
        upsert: jest.fn().mockResolvedValue({ id: 'check-in-a', status: CoachDailyCheckInStatus.PENDING }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    guidance = {
      createDailyCoachMessage: jest.fn().mockResolvedValue({
        conversation: { id: 'conversation-a' },
        message: { id: 'message-a', content: 'What felt meaningful to you today?' },
      }),
    };
    notifications = { send: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: jest.fn((key: string, fallback: unknown) => key === 'DAILY_COACH_MESSAGE_HOUR' ? 10 : fallback),
    };
    service = new DailyCoachCheckInService(prisma, config as any, guidance, notifications);
  });

  it('creates one claimed daily message and links its notification to the conversation', async () => {
    await service.poll(now);
    expect(prisma.coachDailyCheckIn.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_dayKey: { userId: 'user-a', dayKey: '2026-08-10' } },
    }));
    expect(guidance.createDailyCoachMessage).toHaveBeenCalledWith('user-a', 'check-in-a', '2026-08-10');
    expect(notifications.send).toHaveBeenCalledWith('user-a', 'coachReflections', expect.objectContaining({
      data: { conversationId: 'conversation-a', type: 'coachReflection' },
    }));
  });

  it('does not send outside the configured local hour', async () => {
    await service.poll(new Date('2026-08-10T09:05:00.000Z'));
    expect(prisma.coachDailyCheckIn.upsert).not.toHaveBeenCalled();
    expect(guidance.createDailyCoachMessage).not.toHaveBeenCalled();
  });

  it('does not resend a check-in already marked as sent', async () => {
    prisma.coachDailyCheckIn.upsert.mockResolvedValue({ id: 'check-in-a', status: CoachDailyCheckInStatus.SENT });
    await service.poll(now);
    expect(prisma.coachDailyCheckIn.updateMany).not.toHaveBeenCalled();
    expect(guidance.createDailyCoachMessage).not.toHaveBeenCalled();
  });
});
