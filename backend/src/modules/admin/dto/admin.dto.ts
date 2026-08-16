import { AccountStatus, ReportPriority, ReportStatus, Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
}
export class UserQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(AccountStatus) status?: AccountStatus;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() completed?: boolean;
}
export class UpdateUserStatusDto {
  @IsEnum(AccountStatus) status!: AccountStatus;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) reason?: string;
  @IsOptional() @IsString() suspendedUntil?: string;
}
export class UpdateUserRoleDto { @IsEnum(Role) role!: Role; }
export class AdminNoteDto { @IsString() @MinLength(2) @MaxLength(2000) content!: string; }
export class ReportQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
  @IsOptional() @IsEnum(ReportPriority) priority?: ReportPriority;
  @IsOptional() @IsUUID() assignedModeratorId?: string;
}
export class ConversationAccessDto {
  @IsString() @MinLength(10) @MaxLength(1000) justification!: string;
}
export class UpdateReportDto {
  @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
  @IsOptional() @IsEnum(ReportPriority) priority?: ReportPriority;
  @IsOptional() @IsUUID() assignedModeratorId?: string;
  @IsOptional() @IsString() @MaxLength(2000) resolution?: string;
}
export class SettingDto {
  @IsObject() value!: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class AuditQueryDto extends PageQueryDto {
  @IsOptional() @IsString() resource?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() resourceId?: string;
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
