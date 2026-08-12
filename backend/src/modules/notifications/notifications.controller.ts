import { Body, Controller, Delete, Get, Post, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RegisterPushDeviceDto, UpdateNotificationPreferencesDto } from './dto/notifications.dto';
import { PushNotificationsService } from './push-notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: PushNotificationsService) {}
  @Get('preferences')
  @ApiOperation({ summary: 'Lire les préférences de notifications', description: 'Crée les préférences par défaut lors du premier appel.' })
  preferences(@CurrentUser() user: JwtPayload) { return this.notifications.preferences(user.sub); }
  @Patch('preferences')
  @ApiOperation({ summary: 'Mettre à jour toutes les préférences de notifications' })
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateNotificationPreferencesDto) { return this.notifications.updatePreferences(user.sub, dto); }
  @Post('devices')
  @ApiOperation({ summary: 'Enregistrer ou réactiver un appareil Expo Push' })
  register(@CurrentUser() user: JwtPayload, @Body() dto: RegisterPushDeviceDto) { return this.notifications.registerDevice(user.sub, dto); }
  @Delete('devices')
  @ApiOperation({ summary: 'Désactiver les notifications push sur un appareil' })
  disable(@CurrentUser() user: JwtPayload, @Body() dto: RegisterPushDeviceDto) { return this.notifications.disableDevice(user.sub, dto.token); }
}
