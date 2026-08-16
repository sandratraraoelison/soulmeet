import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma, ReportStatus, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  AdminNoteDto,
  AuditQueryDto,
  ConversationAccessDto,
  PageQueryDto,
  ReportQueryDto,
  SettingDto,
  UpdateReportDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UserQueryDto,
} from './dto/admin.dto';

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  accountStatus: true,
  suspendedUntil: true,
  moderationReason: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  profile: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  private page(query: PageQueryDto) {
    return { skip: (query.page - 1) * query.limit, take: query.limit };
  }
  private async audit(
    actorId: string,
    action: string,
    resource: string,
    resourceId?: string,
    oldValue?: Prisma.InputJsonValue,
    newValue?: Prisma.InputJsonValue,
    ipAddress?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        resource,
        resourceId,
        oldValue,
        newValue,
        ipAddress,
      },
    });
  }
  sessions(actorId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId: actorId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, deviceInfo: true, createdAt: true, expiresAt: true },
    });
  }
  async revokeSessions(actorId: string, ip?: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId: actorId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit(
      actorId,
      'ADMIN_SESSIONS_REVOKED',
      'User',
      actorId,
      undefined,
      { count: result.count },
      ip,
    );
    return { revoked: result.count };
  }
  async revokeUserSessions(actorId: string, userId: string, ip?: string) {
    if (actorId === userId)
      throw new BadRequestException(
        'Use the current-session endpoint to revoke your own sessions',
      );
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit(
      actorId,
      'USER_SESSIONS_REVOKED',
      'User',
      userId,
      undefined,
      { count: result.count },
      ip,
    );
    return { revoked: result.count };
  }

  async overview() {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const week = new Date(now.getTime() - 7 * 86400000);
    const [
      totalUsers,
      activeUsers,
      newToday,
      newWeek,
      profiles,
      soulprints,
      coachConversations,
      conversations,
      pendingReports,
      suspendedUsers,
      aiRequests,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({ where: { createdAt: { gte: week } } }),
      this.prisma.profile.count({ where: { onboardingCompleted: true } }),
      this.prisma.soulprint.count({ where: { deletedAt: null } }),
      this.prisma.guidanceConversation.count(),
      this.prisma.conversation.count(),
      this.prisma.report.count({
        where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } },
      }),
      this.prisma.user.count({
        where: { accountStatus: AccountStatus.SUSPENDED },
      }),
      this.prisma.llmUsage.count(),
    ]);
    const recentUsers = await this.prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: safeUserSelect,
    });
    return {
      metrics: {
        totalUsers,
        activeUsers,
        newToday,
        newWeek,
        completedProfiles: profiles,
        soulprints,
        coachConversations,
        matches: null,
        conversations,
        pendingReports,
        suspendedUsers,
        aiRequests,
      },
      recentUsers,
      generatedAt: now,
    };
  }
  async analytics(rawDays = 30) {
    const days = [1, 7, 30, 90].includes(rawDays) ? rawDays : 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const previousStart = new Date(start.getTime() - days * 86400000);
    const [
      users,
      reports,
      soulprints,
      conversations,
      guidance,
      usage,
      previousUsers,
      totalUsers,
      activeUsers,
      completedProfiles,
      suspendedUsers,
      pendingReports,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.report.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.soulprint.findMany({
        where: { createdAt: { gte: start }, deletedAt: null },
        select: { createdAt: true },
      }),
      this.prisma.conversation.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.guidanceConversation.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.llmUsage.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: previousStart, lt: start } },
      }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.profile.count({ where: { onboardingCompleted: true } }),
      this.prisma.user.count({
        where: { accountStatus: AccountStatus.SUSPENDED },
      }),
      this.prisma.report.count({
        where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } },
      }),
    ]);
    const aiRequests = usage.length;
    const buckets = Array.from({ length: days }, (_, index) => {
      const date = new Date(start.getTime() + (index + 1) * 86400000);
      return {
        date: date.toISOString().slice(0, 10),
        users: 0,
        reports: 0,
        soulprints: 0,
        conversations: 0,
        guidance: 0,
        aiRequests: 0,
      };
    });
    const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]));
    const fill = (
      rows: { createdAt: Date }[],
      key:
        | 'users'
        | 'reports'
        | 'soulprints'
        | 'conversations'
        | 'guidance'
        | 'aiRequests',
    ) =>
      rows.forEach((row) => {
        const bucket = byDate.get(row.createdAt.toISOString().slice(0, 10));
        if (bucket) bucket[key]++;
      });
    fill(users, 'users');
    fill(reports, 'reports');
    fill(soulprints, 'soulprints');
    fill(conversations, 'conversations');
    fill(guidance, 'guidance');
    fill(usage, 'aiRequests');
    const [totalSoulprints, totalConversations, totalGuidance] =
      await Promise.all([
        this.prisma.soulprint.count({ where: { deletedAt: null } }),
        this.prisma.conversation.count(),
        this.prisma.guidanceConversation.count(),
      ]);
    return {
      rangeDays: days,
      metrics: {
        totalUsers,
        activeUsers,
        newUsers: users.length,
        previousNewUsers: previousUsers,
        completedProfiles,
        profileActivation: totalUsers
          ? Math.round((completedProfiles / totalUsers) * 100)
          : 0,
        soulprints: totalSoulprints,
        conversations: totalConversations,
        coachConversations: totalGuidance,
        reports: reports.length,
        pendingReports,
        suspendedUsers,
        aiRequests,
        matches: null,
      },
      series: buckets,
    };
  }

  async users(query: UserQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      accountStatus: query.status,
      profile: { country: query.country, onboardingCompleted: query.completed },
      OR: query.search
        ? [
            { email: { contains: query.search, mode: 'insensitive' } },
            {
              profile: {
                firstName: { contains: query.search, mode: 'insensitive' },
              },
            },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...this.page(query),
        orderBy: { createdAt: 'desc' },
        select: safeUserSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async search(rawQuery: string) {
    const query = rawQuery?.trim();
    if (!query || query.length < 2) return [];
    const [users, reports] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            {
              profile: { firstName: { contains: query, mode: 'insensitive' } },
            },
          ],
        },
        take: 6,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          email: true,
          accountStatus: true,
          profile: { select: { firstName: true } },
        },
      }),
      this.prisma.report.findMany({
        where: {
          OR: [
            { reason: { contains: query, mode: 'insensitive' } },
            {
              reportedUser: { email: { contains: query, mode: 'insensitive' } },
            },
          ],
        },
        take: 4,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          reason: true,
          status: true,
          reportedUser: { select: { email: true } },
        },
      }),
    ]);
    return [
      ...users.map((user) => ({
        type: 'user',
        id: user.id,
        title: user.profile?.firstName ?? user.email,
        subtitle: `${user.email} · ${user.accountStatus}`,
        href: `/users/${user.id}`,
      })),
      ...reports.map((report) => ({
        type: 'report',
        id: report.id,
        title: report.reason,
        subtitle: `${report.reportedUser.email} · ${report.status}`,
        href: `/reports?report=${report.id}`,
      })),
    ];
  }
  async user(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...safeUserSelect,
        coach: true,
        soulprint: {
          include: {
            entries: {
              where: {
                visibility: 'MATCHING_ALLOWED',
                sensitivity: { in: ['NORMAL', 'PERSONAL'] },
                deletedAt: null,
              },
              select: {
                id: true,
                category: true,
                key: true,
                value: true,
                confidence: true,
                importance: true,
                updatedAt: true,
              },
            },
            versions: {
              orderBy: { version: 'desc' },
              take: 10,
              select: { id: true, version: true, createdAt: true },
            },
          },
        },
        reportsReceived: {
          select: {
            id: true,
            reason: true,
            priority: true,
            status: true,
            createdAt: true,
          },
        },
        adminNotesReceived: {
          include: { author: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            guidanceConversations: true,
            conversations: true,
            messages: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  async updateStatus(
    actorId: string,
    id: string,
    dto: UpdateUserStatusDto,
    ip?: string,
  ) {
    if (actorId === id)
      throw new BadRequestException(
        'You cannot change your own account status',
      );
    const old = await this.user(id);
    const now = new Date();
    const suspendedUntil =
      dto.status === AccountStatus.SUSPENDED && dto.suspendedUntil
        ? new Date(dto.suspendedUntil)
        : null;
    if (suspendedUntil && suspendedUntil <= now)
      throw new BadRequestException('Suspension end must be in the future');
    const next = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          accountStatus: dto.status,
          isActive: dto.status === AccountStatus.ACTIVE,
          suspendedUntil,
          moderationReason:
            dto.status === AccountStatus.ACTIVE ? null : dto.reason,
        },
        select: safeUserSelect,
      });
      if (dto.status !== AccountStatus.ACTIVE) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      return updated;
    });
    await this.audit(
      actorId,
      'USER_STATUS_CHANGED',
      'User',
      id,
      {
        accountStatus: old.accountStatus,
        suspendedUntil: old.suspendedUntil,
      } as Prisma.InputJsonValue,
      {
        accountStatus: next.accountStatus,
        reason: dto.reason ?? null,
        suspendedUntil: next.suspendedUntil,
      } as Prisma.InputJsonValue,
      ip,
    );
    return next;
  }
  async deleteUser(actorId: string, id: string, ip?: string) {
    if (actorId === id)
      throw new BadRequestException('You cannot delete your own account');
    const user = await this.user(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'USER_DELETED',
          resource: 'User',
          resourceId: id,
          oldValue: {
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus,
          },
          ipAddress: ip,
        },
      });
      await tx.adminNote.deleteMany({ where: { authorId: id } });
      await tx.user.delete({ where: { id } });
    });
    return { deleted: true };
  }
  async updateRole(
    actorId: string,
    id: string,
    dto: UpdateUserRoleDto,
    ip?: string,
  ) {
    if (actorId === id)
      throw new BadRequestException('You cannot change your own role');
    const old = await this.user(id);
    const next = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: safeUserSelect,
    });
    await this.audit(
      actorId,
      'USER_ROLE_CHANGED',
      'User',
      id,
      { role: old.role },
      { role: next.role },
      ip,
    );
    return next;
  }
  async addNote(actorId: string, id: string, dto: AdminNoteDto, ip?: string) {
    const note = await this.prisma.adminNote.create({
      data: { userId: id, authorId: actorId, content: dto.content },
      include: { author: { select: { id: true, email: true } } },
    });
    await this.audit(
      actorId,
      'ADMIN_NOTE_CREATED',
      'User',
      id,
      undefined,
      { noteId: note.id },
      ip,
    );
    return note;
  }
  async coaches(query: PageQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coach.findMany({
        ...this.page(query),
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              accountStatus: true,
              profile: true,
              _count: { select: { guidanceConversations: true } },
            },
          },
        },
      }),
      this.prisma.coach.count(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async soulprints(query: PageQueryDto) {
    const where = { deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.soulprint.findMany({
        ...this.page(query),
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, profile: true } },
          _count: {
            select: {
              entries: {
                where: { visibility: 'MATCHING_ALLOWED', deletedAt: null },
              },
              versions: true,
            },
          },
        },
      }),
      this.prisma.soulprint.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async conversations(query: PageQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.conversation.findMany({
        ...this.page(query),
        orderBy: { updatedAt: 'desc' },
        include: {
          participants: {
            include: {
              user: { select: { id: true, email: true, profile: true } },
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.conversation.count(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async guidance(query: PageQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.guidanceConversation.findMany({
        ...this.page(query),
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, profile: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.guidanceConversation.count(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async reports(query: ReportQueryDto) {
    const where: Prisma.ReportWhereInput = {
      status: query.status,
      priority: query.priority,
      assignedModeratorId: query.assignedModeratorId,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        ...this.page(query),
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, email: true, profile: true } },
          reportedUser: { select: { id: true, email: true, profile: true } },
          assignedModerator: { select: { id: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async updateReport(
    actorId: string,
    id: string,
    dto: UpdateReportDto,
    ip?: string,
  ) {
    const old = await this.prisma.report.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Report not found');
    const resolved =
      dto.status === ReportStatus.RESOLVED ||
      dto.status === ReportStatus.DISMISSED;
    const next = await this.prisma.report.update({
      where: { id },
      data: { ...dto, resolvedAt: resolved ? new Date() : undefined },
    });
    await this.audit(
      actorId,
      'REPORT_UPDATED',
      'Report',
      id,
      { status: old.status, priority: old.priority },
      { status: next.status, priority: next.priority },
      ip,
    );
    return next;
  }
  async moderators() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.SUPER_ADMIN, Role.ADMIN, Role.MODERATOR, Role.SUPPORT],
        },
        isActive: true,
      },
      select: { id: true, email: true, role: true },
      orderBy: { email: 'asc' },
    });
  }
  async matches(query: PageQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        ...this.page(query),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, city: true, country: true },
              },
            },
          },
          matchedUser: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, city: true, country: true },
              },
            },
          },
        },
      }),
      this.prisma.match.count(),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async requestConversationAccess(
    actorId: string,
    resource: 'Conversation' | 'GuidanceConversation',
    conversationId: string,
    dto: ConversationAccessDto,
    ip?: string,
  ) {
    const exists =
      resource === 'Conversation'
        ? await this.prisma.conversation.findUnique({
            where: { id: conversationId },
          })
        : await this.prisma.guidanceConversation.findUnique({
            where: { id: conversationId },
          });
    if (!exists) throw new NotFoundException('Conversation not found');
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.audit(
      actorId,
      'CONVERSATION_ACCESS_GRANTED',
      resource,
      conversationId,
      undefined,
      { justification: dto.justification, expiresAt: expiresAt.toISOString() },
      ip,
    );
    return {
      conversationId,
      grantedAt: new Date(),
      expiresAt,
      windowMinutes: 10,
    };
  }
  async conversationMessages(
    actorId: string,
    resource: 'Conversation' | 'GuidanceConversation',
    conversationId: string,
  ) {
    const exists =
      resource === 'Conversation'
        ? await this.prisma.conversation.findUnique({
            where: { id: conversationId },
          })
        : await this.prisma.guidanceConversation.findUnique({
            where: { id: conversationId },
          });
    if (!exists) throw new NotFoundException('Conversation not found');
    const grant = await this.prisma.auditLog.findFirst({
      where: {
        actorId,
        action: 'CONVERSATION_ACCESS_GRANTED',
        resource,
        resourceId: conversationId,
      },
      orderBy: { createdAt: 'desc' },
    });
    const expiresAt =
      grant?.newValue &&
      typeof grant.newValue === 'object' &&
      'expiresAt' in grant.newValue
        ? new Date((grant.newValue as { expiresAt: string }).expiresAt)
        : null;
    if (!grant || !expiresAt || expiresAt <= new Date())
      throw new ForbiddenException(
        'Conversation access has expired. Request a new access window.',
      );
    const messages =
      resource === 'Conversation'
        ? await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              senderId: true,
              content: true,
              isDeleted: true,
              createdAt: true,
              sender: {
                select: {
                  email: true,
                  profile: { select: { firstName: true } },
                },
              },
            },
          })
        : await this.prisma.guidanceMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              role: true,
              content: true,
              isDeleted: true,
              createdAt: true,
            },
          });
    await this.audit(
      actorId,
      'CONVERSATION_CONTENT_VIEWED',
      resource,
      conversationId,
      undefined,
      { messageCount: messages.length },
      undefined,
    );
    return { conversationId, messages };
  }
  async aiUsage() {
    const [aggregate, byFeature, byModel] = await Promise.all([
      this.prisma.llmUsage.aggregate({
        _count: true,
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cachedTokens: true,
          estimatedCost: true,
        },
        _avg: { latencyMs: true },
      }),
      this.prisma.llmUsage.groupBy({
        by: ['feature'],
        _count: true,
        _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
        _avg: { latencyMs: true },
        orderBy: { feature: 'asc' },
      }),
      this.prisma.llmUsage.groupBy({
        by: ['provider', 'model'],
        _count: true,
        _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
        _avg: { latencyMs: true },
        orderBy: { provider: 'asc' },
      }),
    ]);
    return { ...aggregate, byFeature, byModel };
  }
  settings() {
    return this.prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
  }
  async updateSetting(
    actorId: string,
    actorRole: Role,
    key: string,
    dto: SettingDto,
    ip?: string,
  ) {
    const critical =
      /^(security|auth|admin|roles|permissions|2fa)\b[._-]?/i.test(key);
    if (critical && actorRole !== Role.SUPER_ADMIN)
      throw new ForbiddenException(
        'Only a super administrator can modify security-sensitive settings',
      );
    const old = await this.prisma.appSetting.findUnique({ where: { key } });
    const next = await this.prisma.appSetting.upsert({
      where: { key },
      create: {
        key,
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
        updatedBy: actorId,
      },
      update: {
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
        updatedBy: actorId,
      },
    });
    await this.audit(
      actorId,
      'SETTING_UPDATED',
      'AppSetting',
      key,
      old?.value as Prisma.InputJsonValue | undefined,
      next.value as Prisma.InputJsonValue,
      ip,
    );
    return next;
  }
  async auditLogs(query: AuditQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      resource: query.resource,
      action: query.action,
      resourceId: query.resourceId,
      actorId: query.actorId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { action: { contains: query.search, mode: 'insensitive' } },
            { resource: { contains: query.search, mode: 'insensitive' } },
            { resourceId: { contains: query.search, mode: 'insensitive' } },
            {
              actor: { email: { contains: query.search, mode: 'insensitive' } },
            },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        ...this.page(query),
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async auditExport(query: AuditQueryDto) {
    const page = await this.auditLogs({ ...query, page: 1, limit: 100 });
    const remaining =
      page.total > 100
        ? await this.prisma.auditLog.findMany({
            where: {
              resource: query.resource,
              action: query.action,
              resourceId: query.resourceId,
              actorId: query.actorId,
            },
            take: Math.min(page.total, 5000),
            orderBy: { createdAt: 'desc' },
            include: {
              actor: { select: { id: true, email: true, role: true } },
            },
          })
        : page.items;
    return {
      items: remaining,
      total: page.total,
      truncated: page.total > 5000,
    };
  }
  capabilities() {
    return {
      matches: {
        available: true,
        reason:
          'Recommendations are persisted on demand when the mobile matches endpoint is used.',
      },
      reports: { available: true },
      conversationAccess: { available: true, windowMinutes: 10 },
      aiUsage: {
        available: true,
        collection: 'Providers write LlmUsage records on every completed call.',
      },
      roles: Object.values(Role),
    };
  }
}
