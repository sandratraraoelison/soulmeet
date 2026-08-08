import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { GrowthGoalStatus, GrowthJournalType } from '@prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateGrowthGoalDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) title!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) targetSteps = 5;
  @IsOptional() @IsDateString() targetDate?: string;
}

export class UpdateGrowthProgressDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(20) completedSteps!: number;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class UpdateGrowthGoalDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsEnum(GrowthGoalStatus) status?: GrowthGoalStatus;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}

export class UpsertGrowthCheckInDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) mood!: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reflection?: string;
}

export class CompleteGrowthExerciseDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(500) note?: string;
}
export class CreateGrowthJournalDto {
  @IsOptional() @IsUUID() goalId?: string;
  @IsEnum(GrowthJournalType) type!: GrowthJournalType;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) title?: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(5000) content!: string;
}
export class UpdateGrowthPreferencesDto {
  @IsString() @MaxLength(80) timezone!: string;
  @IsBoolean() remindersEnabled!: boolean;
  @Type(() => Number) @IsInt() @Min(0) @Max(23) reminderHour!: number;
  @IsBoolean() analyticsConsent!: boolean;
  @IsBoolean() gentleStreaks!: boolean;
}
export class GrowthActivityQueryDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
export class EnrollGrowthPathDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80) pathKey!: string;
}
