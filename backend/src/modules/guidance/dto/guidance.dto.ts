import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuidanceConversationStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateGuidanceConversationDto {
  @ApiPropertyOptional({ maxLength: 120 }) @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) title?: string;
}

export class SendGuidanceMessageDto {
  @ApiProperty({ maxLength: 8000 }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(8000) content!: string;
}

export class UpdateGuidanceMessageDto extends SendGuidanceMessageDto {}

export class GuidancePageQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional({ default: 20, maximum: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @ApiPropertyOptional({ enum: GuidanceConversationStatus }) @IsOptional() @IsEnum(GuidanceConversationStatus) status?: GuidanceConversationStatus;
}

export class UpdateGuidanceConversationDto {
  @ApiProperty({ maxLength: 120 }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) title!: string;
}

export class UpsertMemoryDto {
  @ApiProperty({ maxLength: 1000 }) @Transform(trim) @IsString() @MinLength(1) @MaxLength(1000) content!: string;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @Transform(trim) @IsString() @MaxLength(80) category?: string;
}
