import { Transform, Type } from 'class-transformer';
import { SoulprintCategory, SoulprintEntryStatus, SoulprintSensitivity, SoulprintSource, SoulprintVisibility } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreateSoulprintEntryDto {
  @ApiProperty({ enum: SoulprintCategory }) @IsEnum(SoulprintCategory) category!: SoulprintCategory;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @Transform(trim) @IsString() @MaxLength(100) key?: string;
  @ApiProperty({ maxLength: 2000 }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(2000) value!: string;
  @ApiPropertyOptional({ enum: SoulprintVisibility }) @IsOptional() @IsEnum(SoulprintVisibility) visibility?: SoulprintVisibility;
  @ApiPropertyOptional({ enum: SoulprintSensitivity }) @IsOptional() @IsEnum(SoulprintSensitivity) sensitivity?: SoulprintSensitivity;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 }) @IsOptional() @IsInt() @Min(0) @Max(100) importance?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 100 }) @IsOptional() @IsInt() @Min(0) @Max(100) matchingWeight?: number;
}
export class UpdateSoulprintEntryDto extends PartialType(CreateSoulprintEntryDto) {}
export class ConfirmSoulprintEntryDto {
  @ApiPropertyOptional({ maxLength: 2000 }) @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(2000) correctedValue?: string;
}
export class UpdateSoulprintVisibilityDto {
  @ApiProperty({ enum: SoulprintVisibility }) @IsEnum(SoulprintVisibility) visibility!: SoulprintVisibility;
}
export class SoulprintEntriesQueryDto {
  @IsOptional() @IsEnum(SoulprintCategory) category?: SoulprintCategory;
  @IsOptional() @IsEnum(SoulprintEntryStatus) status?: SoulprintEntryStatus;
  @IsOptional() @IsEnum(SoulprintSource) source?: SoulprintSource;
  @IsOptional() @IsEnum(SoulprintVisibility) visibility?: SoulprintVisibility;
  @IsOptional() @IsEnum(SoulprintSensitivity) sensitivity?: SoulprintSensitivity;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
export class SoulprintHistoryQueryDto { @IsOptional() @IsString() cursor?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20; }
