import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, SoulprintCategory, SoulprintEntryStatus, SoulprintSensitivity, SoulprintSource, SoulprintVisibility } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateSoulprintEntryDto, SoulprintEntriesQueryDto, UpdateSoulprintEntryDto } from '../dto/soulprint.dto';
import { SoulprintException } from '../soulprint.exception';
import { SoulprintMergeService } from './soulprint-merge.service';
import { SoulprintSummaryService } from './soulprint-summary.service';

@Injectable()
export class SoulprintService {
  constructor(private readonly prisma: PrismaService, private readonly merge: SoulprintMergeService, private readonly summaries: SoulprintSummaryService) {}
  async ensure(userId: string) {
    const soulprint = await this.prisma.soulprint.upsert({ where: { userId }, create: { userId }, update: {} });
    await this.initializeFromProfile(userId, soulprint.id);
    return soulprint;
  }
  private async initializeFromProfile(userId: string, soulprintId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile?.interestedInGender) return;
    const initialized = await this.prisma.soulprintEntry.findFirst({ where: { soulprintId, category: SoulprintCategory.PARTNER_PREFERENCE, key: 'interested-in-gender' } });
    if (initialized) return;
    await this.merge.merge(soulprintId, {
      category: SoulprintCategory.PARTNER_PREFERENCE, key: 'interested-in-gender', value: `Interested in ${profile.interestedInGender.toLowerCase().replaceAll('_', ' ')}`,
      normalizedValue: profile.interestedInGender, source: SoulprintSource.USER_PROFILE, confidence: 1, importance: 70,
      sensitivity: SoulprintSensitivity.PERSONAL, suggestedVisibility: SoulprintVisibility.PRIVATE, evidenceMessageIds: [],
    }).catch((error: unknown) => { if (!(error instanceof SoulprintException && error.code === 'SOULPRINT_ENTRY_DUPLICATE')) throw error; });
  }
  async get(userId: string) {
    const soulprint = await this.ensure(userId);
    return this.prisma.soulprint.findUniqueOrThrow({ where: { id: soulprint.id }, include: { entries: { where: { status: { not: SoulprintEntryStatus.DELETED } }, orderBy: { importance: 'desc' } } } });
  }
  async summary(userId: string) { const soulprint = await this.ensure(userId); return { summary: soulprint.summary, completenessScore: soulprint.completenessScore, version: soulprint.summaryVersion }; }
  async entries(userId: string, query: SoulprintEntriesQueryDto) {
    const soulprint = await this.ensure(userId);
    const rows = await this.prisma.soulprintEntry.findMany({
      where: { soulprintId: soulprint.id, category: query.category, status: query.status ?? { not: SoulprintEntryStatus.DELETED }, source: query.source, visibility: query.visibility, sensitivity: query.sensitivity },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: { evidence: true },
    });
    const page = rows.slice(0, query.limit);
    return { entries: page, nextCursor: rows.length > query.limit ? page.at(-1)?.id ?? null : null };
  }
  async entry(userId: string, entryId: string) { return this.ownedEntry(userId, entryId, true); }
  async createEntry(userId: string, dto: CreateSoulprintEntryDto) {
    const soulprint = await this.ensure(userId);
    const fingerprint = `${dto.category}:${this.merge.normalize(dto.key || dto.value)}`;
    if (await this.prisma.soulprintEntry.findUnique({ where: { soulprintId_fingerprint: { soulprintId: soulprint.id, fingerprint } } }))
      throw new SoulprintException('SOULPRINT_ENTRY_DUPLICATE', 'An equivalent Soulprint entry already exists', HttpStatus.CONFLICT);
    const entry = await this.merge.merge(soulprint.id, { ...dto, normalizedValue: this.merge.normalize(dto.value), source: SoulprintSource.MANUAL_USER_ENTRY, confidence: 0.99, importance: dto.importance ?? 60, sensitivity: dto.sensitivity ?? SoulprintSensitivity.NORMAL, suggestedVisibility: dto.visibility ?? SoulprintVisibility.PRIVATE, evidenceMessageIds: [] });
    await this.summaries.recalculate(soulprint.id); return entry;
  }
  async updateEntry(userId: string, entryId: string, dto: UpdateSoulprintEntryDto) {
    const previous = await this.ownedEntry(userId, entryId);
    if (dto.visibility === SoulprintVisibility.MATCHING_ALLOWED && (dto.sensitivity ?? previous.sensitivity) === SoulprintSensitivity.HIGHLY_SENSITIVE)
      throw new SoulprintException('SOULPRINT_SENSITIVE_MATCHING_FORBIDDEN', 'Highly sensitive entries cannot be used for matching');
    const nextCategory = dto.category ?? previous.category;
    const nextKey = dto.key ?? previous.key;
    const nextValue = dto.value ?? previous.value;
    const data = { ...dto, normalizedValue: this.merge.normalize(nextValue), fingerprint: `${nextCategory}:${this.merge.normalize(nextKey || nextValue)}` };
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.soulprintEntry.update({ where: { id: entryId }, data });
      await tx.soulprintEntryChange.create({ data: { entryId, changeType: 'USER_UPDATED', changedBy: userId, previousValue: previous as unknown as Prisma.InputJsonValue, newValue: result as unknown as Prisma.InputJsonValue } });
      return result;
    });
    await this.summaries.recalculate(previous.soulprintId); return updated;
  }
  async confirm(userId: string, entryId: string, correctedValue?: string) {
    const previous = await this.ownedEntry(userId, entryId);
    if (previous.status === SoulprintEntryStatus.CONFIRMED) throw new SoulprintException('SOULPRINT_ENTRY_ALREADY_CONFIRMED', 'Entry is already confirmed');
    const value = correctedValue ?? previous.value;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.soulprintEntry.update({ where: { id: entryId }, data: { value, normalizedValue: this.merge.normalize(value), fingerprint: `${previous.category}:${this.merge.normalize(previous.key || value)}`, source: SoulprintSource.USER_CONFIRMED, status: SoulprintEntryStatus.CONFIRMED, confidence: 1, confirmedAt: new Date(), rejectedAt: null } });
      await tx.soulprintEntryChange.create({ data: { entryId, changeType: correctedValue ? 'USER_CORRECTED_CONFIRMED' : 'USER_CONFIRMED', changedBy: userId, previousValue: previous as unknown as Prisma.InputJsonValue, newValue: result as unknown as Prisma.InputJsonValue } }); return result;
    });
    await this.summaries.recalculate(previous.soulprintId); return updated;
  }
  async reject(userId: string, entryId: string) {
    const previous = await this.ownedEntry(userId, entryId);
    if (previous.status === SoulprintEntryStatus.REJECTED) throw new SoulprintException('SOULPRINT_ENTRY_ALREADY_REJECTED', 'Entry is already rejected');
    const updated = await this.changeStatus(previous, SoulprintEntryStatus.REJECTED, userId, 'USER_REJECTED', { rejectedAt: new Date() });
    await this.summaries.recalculate(previous.soulprintId); return updated;
  }
  async delete(userId: string, entryId: string) {
    const previous = await this.ownedEntry(userId, entryId);
    const updated = await this.changeStatus(previous, SoulprintEntryStatus.DELETED, userId, 'USER_DELETED', { deletedAt: new Date() });
    await this.summaries.recalculate(previous.soulprintId); return updated;
  }
  async visibility(userId: string, entryId: string, visibility: SoulprintVisibility) {
    const previous = await this.ownedEntry(userId, entryId);
    if (visibility === SoulprintVisibility.MATCHING_ALLOWED && previous.sensitivity === SoulprintSensitivity.HIGHLY_SENSITIVE) throw new SoulprintException('SOULPRINT_SENSITIVE_MATCHING_FORBIDDEN', 'Highly sensitive entries cannot be used for matching');
    return this.updateEntry(userId, entryId, { visibility });
  }
  async pending(userId: string, query: SoulprintEntriesQueryDto) { query.status = SoulprintEntryStatus.PENDING_CONFIRMATION; return this.entries(userId, query); }
  async history(userId: string, cursor?: string, limit = 20) {
    await this.ensure(userId);
    const rows = await this.prisma.soulprintEntryChange.findMany({ where: { entry: { soulprint: { userId } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    const page = rows.slice(0, limit); return { changes: page, nextCursor: rows.length > limit ? page.at(-1)?.id ?? null : null };
  }
  async recalculate(userId: string) { const soulprint = await this.ensure(userId); return this.summaries.recalculate(soulprint.id); }
  private async ownedEntry(userId: string, id: string, include = false) {
    const entry = await this.prisma.soulprintEntry.findFirst({ where: { id, soulprint: { userId } }, ...(include ? { include: { evidence: true, changes: { orderBy: { createdAt: 'desc' } } } } : {}) });
    if (!entry) throw new SoulprintException('SOULPRINT_ENTRY_NOT_FOUND', 'Soulprint entry not found', HttpStatus.NOT_FOUND); return entry;
  }
  private changeStatus(previous: Awaited<ReturnType<SoulprintService['ownedEntry']>>, status: SoulprintEntryStatus, userId: string, changeType: string, extra: object) {
    return this.prisma.$transaction(async (tx) => { const result = await tx.soulprintEntry.update({ where: { id: previous.id }, data: { status, ...extra } }); await tx.soulprintEntryChange.create({ data: { entryId: previous.id, changeType, changedBy: userId, previousValue: previous as unknown as Prisma.InputJsonValue, newValue: result as unknown as Prisma.InputJsonValue } }); return result; });
  }
}
