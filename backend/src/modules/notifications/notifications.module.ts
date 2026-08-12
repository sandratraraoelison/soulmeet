import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { PushNotificationsService } from './push-notifications.service';

@Module({ imports: [AuthModule], controllers: [NotificationsController], providers: [PushNotificationsService], exports: [PushNotificationsService] })
export class NotificationsModule {}
