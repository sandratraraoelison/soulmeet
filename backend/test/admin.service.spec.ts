import { BadRequestException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { AdminService } from '../src/modules/admin/admin.service';

describe('AdminService safety and search', () => {
  it('prevents an administrator from suspending their own account', async () => {
    const service = new AdminService({} as never);
    await expect(service.updateStatus('same-id', 'same-id', { status: AccountStatus.SUSPENDED, reason: 'test' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes every active refresh session when an account is suspended', async () => {
    const current = { id: 'user-id', accountStatus: AccountStatus.ACTIVE, suspendedUntil: null };
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(current), update: jest.fn().mockResolvedValue({ ...current, accountStatus: AccountStatus.SUSPENDED }) },
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      auditLog: { create: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
    await new AdminService(prisma).updateStatus('admin-id', 'user-id', { status: AccountStatus.SUSPENDED, reason: 'Safety review' });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-id', revokedAt: null } }));
  });

  it('permanently deletes a banned account and preserves an audit record', async () => {
    const target = { id: 'user-id', email: 'user@example.com', role: 'USER', accountStatus: AccountStatus.ACTIVE };
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(target), delete: jest.fn() },
      adminNote: { deleteMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
    await expect(new AdminService(prisma).deleteUser('admin-id', 'user-id')).resolves.toEqual({ deleted: true });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'USER_DELETED', resourceId: 'user-id' }) }));
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-id' } });
  });

  it('returns normalized user and report search results', async () => {
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', email: 'jane@example.com', accountStatus: 'ACTIVE', profile: { firstName: 'Jane' } }]) },
      report: { findMany: jest.fn().mockResolvedValue([{ id: 'r1', reason: 'Spam', status: 'OPEN', reportedUser: { email: 'bad@example.com' } }]) },
    };
    const results = await new AdminService(prisma as never).search('ja');
    expect(results).toEqual([
      expect.objectContaining({ type: 'user', href: '/users/u1' }),
      expect.objectContaining({ type: 'report', href: '/reports?report=r1' }),
    ]);
  });

  it('does not query broad global searches shorter than two characters', async () => {
    const prisma = { user: { findMany: jest.fn() }, report: { findMany: jest.fn() } };
    await expect(new AdminService(prisma as never).search('a')).resolves.toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
