import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CoachGender, CoachPersonality } from '@prisma/client';
import {
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
export class CreateCoachDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @ApiProperty({ enum: CoachGender })
  @IsEnum(CoachGender)
  gender!: CoachGender;
  @ApiProperty({ enum: CoachPersonality, required: false, deprecated: true })
  @IsOptional()
  @IsEnum(CoachPersonality)
  personality?: CoachPersonality;
  @ApiProperty({ enum: CoachPersonality, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(CoachPersonality, { each: true })
  traits!: CoachPersonality[];
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customInstructions?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) speakingStyle?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) adviceStyle?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(120) appearance?: string;
  @ApiProperty({ required: false, minimum: 0, maximum: 100 }) @IsOptional() @IsInt() @Min(0) @Max(100) humorLevel?: number;
  @ApiProperty({ required: false, minimum: 0, maximum: 100 }) @IsOptional() @IsInt() @Min(0) @Max(100) empathyLevel?: number;
  @ApiProperty({ required: false, minimum: 0, maximum: 100 }) @IsOptional() @IsInt() @Min(0) @Max(100) directnessLevel?: number;
  @ApiProperty({ required: false, minimum: 0, maximum: 100 }) @IsOptional() @IsInt() @Min(0) @Max(100) energyLevel?: number;
}
export class UpdateCoachDto extends PartialType(CreateCoachDto) {}
