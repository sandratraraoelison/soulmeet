import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MatchResponseDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsIn(['ACCEPTED', 'REJECTED'])
  response!: 'ACCEPTED' | 'REJECTED';
}

export class MatchHistoryQueryDto {
  @ApiPropertyOptional({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsOptional()
  @IsIn(['ACCEPTED', 'REJECTED'])
  response?: 'ACCEPTED' | 'REJECTED';
}

export class DiscoverQueryDto {
  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
