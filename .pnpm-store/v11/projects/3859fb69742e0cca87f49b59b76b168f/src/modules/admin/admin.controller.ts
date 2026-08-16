import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { AdminNoteDto, AuditQueryDto, ConversationAccessDto, PageQueryDto, ReportQueryDto, SettingDto, UpdateReportDto, UpdateUserRoleDto, UpdateUserStatusDto, UserQueryDto } from './dto/admin.dto';

const adminRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.SUPPORT];

@ApiTags('admin') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...adminRoles) @Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  private ip(req: Request) { return req.ip; }
  @Get('capabilities') capabilities() { return this.admin.capabilities(); }
  @Get('sessions') sessions(@CurrentUser() actor: JwtPayload) { return this.admin.sessions(actor.sub); }
  @Delete('sessions') revokeSessions(@CurrentUser() actor: JwtPayload, @Req() req: Request) { return this.admin.revokeSessions(actor.sub, this.ip(req)); }
  @Get('users/:id/sessions') @Roles(Role.SUPER_ADMIN)
  userSessions(@Param('id') id: string) { return this.admin.sessions(id); }
  @Delete('users/:id/sessions') @Roles(Role.SUPER_ADMIN)
  revokeUserSessions(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Req() req: Request) { return this.admin.revokeUserSessions(actor.sub, id, this.ip(req)); }
  @Get('overview') overview() { return this.admin.overview(); }
  @Get('analytics') analytics(@Query('days') days?: string) { return this.admin.analytics(days ? Number(days) : 30); }
  @Get('moderators') moderators() { return this.admin.moderators(); }
  @Get('matches') matches(@Query() query: PageQueryDto) { return this.admin.matches(query); }
  @Post('conversations/:id/access')
  conversationAccess(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: ConversationAccessDto, @Req() req: Request) { return this.admin.requestConversationAccess(actor.sub, 'Conversation', id, dto, this.ip(req)); }
  @Get('conversations/:id/messages') conversationMessages(@CurrentUser() actor: JwtPayload, @Param('id') id: string) { return this.admin.conversationMessages(actor.sub, 'Conversation', id); }
  @Post('guidance-conversations/:id/access')
  guidanceAccess(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: ConversationAccessDto, @Req() req: Request) { return this.admin.requestConversationAccess(actor.sub, 'GuidanceConversation', id, dto, this.ip(req)); }
  @Get('guidance-conversations/:id/messages') guidanceMessages(@CurrentUser() actor: JwtPayload, @Param('id') id: string) { return this.admin.conversationMessages(actor.sub, 'GuidanceConversation', id); }
  @Get('search') search(@Query('q') query: string) { return this.admin.search(query); }
  @Get('users') users(@Query() query: UserQueryDto) { return this.admin.users(query); }
  @Get('users/:id') user(@Param('id') id: string) { return this.admin.user(id); }
  @Patch('users/:id/status') @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR)
  status(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserStatusDto, @Req() req: Request) { return this.admin.updateStatus(actor.sub, id, dto, this.ip(req)); }
  @Delete('users/:id') @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR)
  deleteUser(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Req() req: Request) { return this.admin.deleteUser(actor.sub, id, this.ip(req)); }
  @Patch('users/:id/role') @Roles(Role.SUPER_ADMIN)
  role(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserRoleDto, @Req() req: Request) { return this.admin.updateRole(actor.sub, id, dto, this.ip(req)); }
  @Post('users/:id/notes') note(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: AdminNoteDto, @Req() req: Request) { return this.admin.addNote(actor.sub, id, dto, this.ip(req)); }
  @Get('coaches') coaches(@Query() query: PageQueryDto) { return this.admin.coaches(query); }
  @Get('soulprints') soulprints(@Query() query: PageQueryDto) { return this.admin.soulprints(query); }
  @Get('conversations') conversations(@Query() query: PageQueryDto) { return this.admin.conversations(query); }
  @Get('guidance-conversations') guidance(@Query() query: PageQueryDto) { return this.admin.guidance(query); }
  @Get('reports') reports(@Query() query: ReportQueryDto) { return this.admin.reports(query); }
  @Patch('reports/:id') @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR)
  report(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Body() dto: UpdateReportDto, @Req() req: Request) { return this.admin.updateReport(actor.sub, id, dto, this.ip(req)); }
  @Get('ai-usage') aiUsage() { return this.admin.aiUsage(); }
  @Get('settings') settings() { return this.admin.settings(); }
  @Patch('settings/:key') @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  setting(@CurrentUser() actor: JwtPayload, @Param('key') key: string, @Body() dto: SettingDto, @Req() req: Request) { return this.admin.updateSetting(actor.sub, actor.role as Role, key, dto, this.ip(req)); }
  @Get('audit-logs/export') @Roles(Role.SUPER_ADMIN)
  auditExport(@Query() query: AuditQueryDto) { return this.admin.auditExport(query); }
  @Get('audit-logs') audit(@Query() query: AuditQueryDto) { return this.admin.auditLogs(query); }
}
