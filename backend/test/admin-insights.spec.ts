import { BadRequestException } from '@nestjs/common';
import { ReportStatus, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminService } from '../src/modules/admin/admin.service';
import {
  InsightsQueryDto,
  UpdateReportDto,
} from '../src/modules/admin/dto/admin.dto';
import { engagementSql, period } from '../src/modules/admin/insights';

describe('Admin reporting boundaries', () => {
  it('includes today from midnight and compares the same elapsed duration', () => {
    const p = period(7, new Date('2026-09-11T13:45:00Z'));
    expect(p.start.toISOString()).toBe('2026-09-05T00:00:00.000Z');
    expect(p.previousEnd.toISOString()).toBe('2026-09-04T13:45:00.000Z');
    expect(p.end.getTime() - p.start.getTime()).toBe(
      p.previousEnd.getTime() - p.previousStart.getTime(),
    );
    expect(period(1, p.end).start.toISOString()).toBe(
      '2026-09-11T00:00:00.000Z',
    );
  });
  it('validates periods and permits explicit moderator removal', async () => {
    expect(
      await validate(plainToInstance(InsightsQueryDto, { days: '7' })),
    ).toHaveLength(0);
    expect(
      await validate(plainToInstance(InsightsQueryDto, { days: '365' })),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(UpdateReportDto, { assignedModeratorId: null }),
      ),
    ).toHaveLength(0);
  });
  it('parameterizes geographic values instead of inserting SQL', () => {
    const country = "x'; DROP TABLE users; --";
    const q = engagementSql(new Date(), new Date(), country);
    expect(q.values).toContain(country);
    expect(q.sql).not.toContain(country);
  });
  it('removes an assignment and records the change in the audit trail', async () => {
    const old = {
      status: ReportStatus.OPEN,
      priority: 'HIGH',
      assignedModeratorId: 'moderator',
      resolution: null,
    };
    const prisma = {
      report: {
        findUnique: jest.fn().mockResolvedValue(old),
        update: jest
          .fn()
          .mockResolvedValue({ ...old, assignedModeratorId: null }),
      },
      auditLog: { create: jest.fn() },
    };
    await new AdminService(prisma as never).updateReport('actor', 'report', {
      assignedModeratorId: null,
    });
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedModeratorId: null }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldValue: expect.objectContaining({
            assignedModeratorId: 'moderator',
          }),
          newValue: expect.objectContaining({ assignedModeratorId: null }),
        }),
      }),
    );
  });
  it('requires a meaningful resolution before closing a report', async () => {
    const prisma = {
      report: {
        findUnique: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
    };
    await expect(
      new AdminService(prisma as never).updateReport('actor', 'report', {
        status: ReportStatus.RESOLVED,
        resolution: '  ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
  it('clears the previous resolution when reopening a report', async () => {
    const prisma = {
      report: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ status: ReportStatus.RESOLVED }),
        update: jest.fn().mockResolvedValue({ status: ReportStatus.OPEN }),
      },
      auditLog: { create: jest.fn() },
    };
    await new AdminService(prisma as never).updateReport('actor', 'report', {
      status: ReportStatus.OPEN,
    });
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resolvedAt: null, resolution: null }),
      }),
    );
  });
  it('rejects invalid budgets before writing any setting', async () => {
    const service = new AdminService({} as never);
    for (const amount of [0, -1, '10', Infinity]) {
      await expect(
        service.updateSetting('actor', Role.ADMIN, 'ai.monthlyBudget', {
          value: { amount },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});
