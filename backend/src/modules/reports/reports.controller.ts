import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportPriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateReportDto {
  @IsUUID() reportedUserId!: string;
  @IsString() @MinLength(2) @MaxLength(120) reason!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(ReportPriority) priority?: ReportPriority;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsUUID() messageId?: string;
}

@ApiTags('reports') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportDto) {
    return this.prisma.report.create({ data: { ...dto, reporterId: user.sub } });
  }
}
