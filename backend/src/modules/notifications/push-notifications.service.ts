import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RegisterPushDeviceDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';

type Category = 'newMessages' | 'coachReflections' | 'soulprintConfirmations' | 'growthReminders';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  preferences(userId: string) {
    return this.prisma.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {} });
  }
  updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    try { new Intl.DateTimeFormat('en', { timeZone: dto.timezone }).format(); }
    catch { dto.timezone = 'UTC'; }
    return this.prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...dto }, update: dto });
  }
  registerDevice(userId: string, dto: RegisterPushDeviceDto) {
    return this.prisma.pushDevice.upsert({ where: { token: dto.token }, create: { userId, ...dto }, update: { userId, platform: dto.platform, active: true, lastSeenAt: new Date() } });
  }
  disableDevice(userId: string, token: string) {
    return this.prisma.pushDevice.updateMany({ where: { userId, token }, data: { active: false } });
  }
  async send(userId: string, category: Category, message: { title: string; body: string; data?: Record<string, string> }) {
    const preferences = await this.preferences(userId);
    if (!preferences[category] || this.isQuiet(preferences)) return;
    const devices = await this.prisma.pushDevice.findMany({ where: { userId, active: true } });
    await Promise.all(devices.map((device) => this.sendToDevice(device.id, device.token, message)));
  }
  private isQuiet(preferences: { quietHoursEnabled: boolean; quietHoursStart: number; quietHoursEnd: number; timezone: string }) {
    if (!preferences.quietHoursEnabled || preferences.quietHoursStart === preferences.quietHoursEnd) return false;
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: preferences.timezone, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    return preferences.quietHoursStart < preferences.quietHoursEnd
      ? hour >= preferences.quietHoursStart && hour < preferences.quietHoursEnd
      : hour >= preferences.quietHoursStart || hour < preferences.quietHoursEnd;
  }
  private async sendToDevice(deviceId: string, token: string, message: { title: string; body: string; data?: Record<string, string> }) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(this.config.get<string>('EXPO_ACCESS_TOKEN') ? { Authorization: `Bearer ${this.config.get<string>('EXPO_ACCESS_TOKEN')}` } : {}) },
          body: JSON.stringify({ to: token, sound: 'default', channelId: 'messages', priority: 'high', ...message }),
        });
        const payload = await response.json() as { data?: { status?: string; details?: { error?: string }; message?: string } };
        if (payload.data?.details?.error === 'DeviceNotRegistered') await this.prisma.pushDevice.update({ where: { id: deviceId }, data: { active: false } });
        if (response.ok && payload.data?.status !== 'error') return;
        if (response.status !== 429 && response.status < 500) return this.logger.warn(`Push rejected: ${payload.data?.message ?? response.status}`);
      } catch (error) { if (attempt === 2) this.logger.warn(`Push failed: ${error instanceof Error ? error.message : 'unknown'}`); }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}
