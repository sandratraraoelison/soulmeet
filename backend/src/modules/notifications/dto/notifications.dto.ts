import { IsBoolean, IsIn, IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPushDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', description: 'Token attribué par Expo Push Service' })
  @IsString() @Matches(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/) token!: string;
  @ApiProperty({ enum: ['android', 'ios'], example: 'android' })
  @IsIn(['android', 'ios']) platform!: 'android' | 'ios';
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ default: true })
  @IsBoolean() newMessages!: boolean;
  @ApiProperty({ default: true })
  @IsBoolean() coachReflections!: boolean;
  @ApiProperty({ default: true })
  @IsBoolean() soulprintConfirmations!: boolean;
  @ApiProperty({ default: false })
  @IsBoolean() growthReminders!: boolean;
  @ApiProperty({ default: false })
  @IsBoolean() quietHoursEnabled!: boolean;
  @ApiProperty({ minimum: 0, maximum: 23, default: 22, description: 'Heure locale de début' })
  @IsInt() @Min(0) @Max(23) quietHoursStart!: number;
  @ApiProperty({ minimum: 0, maximum: 23, default: 8, description: 'Heure locale de fin' })
  @IsInt() @Min(0) @Max(23) quietHoursEnd!: number;
  @ApiProperty({ example: 'Europe/Paris', description: 'Fuseau IANA utilisé pour les heures silencieuses' })
  @IsString() timezone!: string;
}
